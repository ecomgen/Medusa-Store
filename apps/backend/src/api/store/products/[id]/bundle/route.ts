import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { BUNDLE_PRODUCT_MODULE } from "../../../../../modules/bundle-product"

type Queryable = {
  query?: (
    sql: string,
    values?: unknown[]
  ) => Promise<{ rows: Record<string, any>[] }>
  raw?: (
    sql: string,
    values?: unknown[]
  ) => Promise<{ rows?: Record<string, any>[] } | Record<string, any>[]>
}

type BundleRecord = {
  id: string
  parent_product_id: string
  title: string
  description: string | null
  is_active: boolean
}

type BundleItemRecord = {
  id: string
  bundle_id: string
  parent_product_id: string
  item_product_id: string
}

type BundleProductModuleService = {
  listBundles: (filters?: Record<string, unknown>) => Promise<BundleRecord[]>
  listBundleItems: (
    filters?: Record<string, unknown>
  ) => Promise<BundleItemRecord[]>
}

const query = async (
  db: Queryable,
  sql: string,
  values?: unknown[]
): Promise<{ rows: Record<string, any>[] }> => {
  if (db.query) {
    return db.query(sql, values)
  }

  if (!db.raw) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Database connection does not support query or raw"
    )
  }

  const knexSql = sql.replace(/\$\d+/g, "?")
  const result = await db.raw(knexSql, values)

  if (Array.isArray(result)) {
    return {
      rows: result,
    }
  }

  return {
    rows: result.rows ?? [],
  }
}

const loadProducts = async (db: Queryable, productIds: string[]) => {
  if (!productIds.length) {
    return []
  }

  const placeholders = productIds.map((_, index) => `$${index + 1}`).join(", ")

  const productsResult = await query(
    db,
    `
      select
        p.id as product_id,
        p.title,
        p.handle,
        p.thumbnail,
        (
          select pv.id
          from product_variant pv
          where pv.product_id = p.id
            and pv.deleted_at is null
          order by pv.created_at asc
          limit 1
        ) as variant_id
      from product p
      where p.id in (${placeholders})
        and p.deleted_at is null
    `,
    productIds
  )
  const productsById = new Map(
    productsResult.rows.map((product) => [product.product_id, product])
  )

  return productIds
    .map((productId) => productsById.get(productId))
    .filter(Boolean)
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const bundleService = req.scope.resolve(
    BUNDLE_PRODUCT_MODULE
  ) as BundleProductModuleService
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Queryable
  const productId = req.params.id
  const bundle = (
    await bundleService.listBundles({
      parent_product_id: productId,
      is_active: true,
    })
  )[0]

  if (!bundle) {
    res.json({
      bundle: null,
    })
    return
  }

  const items = await bundleService.listBundleItems({
    bundle_id: bundle.id,
    parent_product_id: productId,
  })
  const productIds = items.map((item) => item.item_product_id)
  const products = await loadProducts(db, productIds)

  res.json({
    bundle: {
      ...bundle,
      items: products,
    },
  })
}

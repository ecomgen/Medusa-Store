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

type BundlePayload = {
  is_bundle?: boolean
  title?: string
  description?: string | null
  is_active?: boolean
  product_ids?: string[]
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
  createBundles: (data: Partial<BundleRecord>) => Promise<BundleRecord>
  updateBundles: (data: Partial<BundleRecord>) => Promise<BundleRecord>
  softDeleteBundles: (ids: string | string[]) => Promise<void>
  listBundleItems: (
    filters?: Record<string, unknown>
  ) => Promise<BundleItemRecord[]>
  createBundleItems: (
    data: Partial<BundleItemRecord>[]
  ) => Promise<BundleItemRecord[]>
  softDeleteBundleItems: (ids: string | string[]) => Promise<void>
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
      select p.id, p.title, p.thumbnail
      from product p
      where p.id in (${placeholders})
        and p.deleted_at is null
    `,
    productIds
  )
  const productsById = new Map(
    productsResult.rows.map((product) => [product.id, product])
  )

  return productIds
    .map((productId) => productsById.get(productId))
    .filter(Boolean)
}

const loadBundle = async (
  bundleService: BundleProductModuleService,
  db: Queryable,
  productId: string
) => {
  const bundle = (
    await bundleService.listBundles({ parent_product_id: productId })
  )[0]

  if (!bundle) {
    return null
  }

  const items = await bundleService.listBundleItems({
    bundle_id: bundle.id,
    parent_product_id: productId,
  })
  const productIds = items.map((item) => item.item_product_id)
  const products = await loadProducts(db, productIds)

  return {
    ...bundle,
    product_ids: productIds,
    products,
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const bundleService = req.scope.resolve(
    BUNDLE_PRODUCT_MODULE
  ) as BundleProductModuleService
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Queryable
  const productId = req.params.id

  const bundle = await loadBundle(bundleService, db, productId)

  res.json({
    bundle,
  })
}

export const POST = async (
  req: MedusaRequest<BundlePayload>,
  res: MedusaResponse
) => {
  const bundleService = req.scope.resolve(
    BUNDLE_PRODUCT_MODULE
  ) as BundleProductModuleService
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Queryable
  const productId = req.params.id
  const body = req.body
  const productIds = Array.from(new Set(body.product_ids ?? []))
  const existingBundle = (
    await bundleService.listBundles({ parent_product_id: productId })
  )[0]

  if (body.is_bundle === false) {
    if (existingBundle) {
      const existingItems = await bundleService.listBundleItems({
        bundle_id: existingBundle.id,
        parent_product_id: productId,
      })

      if (existingItems.length) {
        await bundleService.softDeleteBundleItems(
          existingItems.map((item) => item.id)
        )
      }

      await bundleService.softDeleteBundles(existingBundle.id)
    }

    res.json({
      bundle: null,
    })
    return
  }

  const bundleData = {
    parent_product_id: productId,
    title: body.title ?? "Bundle",
    description: body.description ?? null,
    is_active: body.is_active ?? true,
  }

  const bundle = existingBundle
    ? await bundleService.updateBundles({
        id: existingBundle.id,
        ...bundleData,
      })
    : await bundleService.createBundles(bundleData)

  const existingItems = await bundleService.listBundleItems({
    bundle_id: bundle.id,
    parent_product_id: productId,
  })

  if (existingItems.length) {
    await bundleService.softDeleteBundleItems(
      existingItems.map((item) => item.id)
    )
  }

  if (productIds.length) {
    await bundleService.createBundleItems(
      productIds.map((itemProductId) => ({
        bundle_id: bundle.id,
        parent_product_id: productId,
        item_product_id: itemProductId,
      }))
    )
  }

  const savedBundle = await loadBundle(bundleService, db, productId)

  res.json({
    bundle: savedBundle,
  })
}

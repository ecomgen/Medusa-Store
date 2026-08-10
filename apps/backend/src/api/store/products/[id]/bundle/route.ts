import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

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

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Queryable
  const productId = req.params.id

  const bundleResult = await query(
    db,
    `
      select b.id, b.title, b.description, b.is_active
      from product_product_bundle_product_bundle pb
      join bundle b on b.id = pb.bundle_id and b.deleted_at is null
      where pb.product_id = $1
        and pb.deleted_at is null
        and b.is_active = true
      order by pb.created_at desc
      limit 1
    `,
    [productId]
  )

  const bundle = bundleResult.rows[0]

  if (!bundle) {
    res.json({
      bundle: null,
    })
    return
  }

  const itemsResult = await query(
    db,
    `
      select
        bi.item_product_id as product_id,
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
      from bundle_item bi
      join product p on p.id = bi.item_product_id and p.deleted_at is null
      where bi.bundle_id = $1
        and bi.parent_product_id = $2
        and bi.deleted_at is null
      order by bi.created_at asc
    `,
    [bundle.id, productId]
  )

  res.json({
    bundle: {
      ...bundle,
      items: itemsResult.rows,
    },
  })
}

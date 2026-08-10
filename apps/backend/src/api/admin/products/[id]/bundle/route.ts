import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import crypto from "node:crypto"

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

const id = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`

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

const loadBundle = async (db: Queryable, productId: string) => {
  const bundleResult = await query(
    db,
    `
      select b.id, b.title, b.description, b.is_active
      from product_product_bundle_product_bundle pb
      join bundle b on b.id = pb.bundle_id and b.deleted_at is null
      where pb.product_id = $1 and pb.deleted_at is null
      order by pb.created_at desc
      limit 1
    `,
    [productId]
  )

  const bundle = bundleResult.rows[0]

  if (!bundle) {
    return null
  }

  const itemsResult = await query(
    db,
    `
      select
        bi.item_product_id as id,
        p.title,
        p.thumbnail
      from bundle_item bi
      join product p on p.id = bi.item_product_id and p.deleted_at is null
      where bi.bundle_id = $1
        and bi.parent_product_id = $2
        and bi.deleted_at is null
      order by bi.created_at asc
    `,
    [bundle.id, productId]
  )

  return {
    ...bundle,
    product_ids: itemsResult.rows.map((item) => item.id),
    products: itemsResult.rows,
  }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Queryable
  const productId = req.params.id

  const bundle = await loadBundle(db, productId)

  res.json({
    bundle,
  })
}

export const POST = async (
  req: MedusaRequest<BundlePayload>,
  res: MedusaResponse
) => {
  const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Queryable
  const productId = req.params.id
  const body = req.body
  const productIds = Array.from(new Set(body.product_ids ?? []))

  await query(db, "begin")

  try {
    const existingResult = await query(
      db,
      `
        select b.id
        from product_product_bundle_product_bundle pb
        join bundle b on b.id = pb.bundle_id and b.deleted_at is null
        where pb.product_id = $1 and pb.deleted_at is null
        order by pb.created_at desc
        limit 1
      `,
      [productId]
    )

    const existingBundleId = existingResult.rows[0]?.id as string | undefined

    if (body.is_bundle === false) {
      if (existingBundleId) {
        await query(
          db,
          `
            update bundle_product_bundle_item_product_product bip
            set deleted_at = now(), updated_at = now()
            where bip.bundle_item_id in (
              select id from bundle_item where bundle_id = $1 and deleted_at is null
            )
          `,
          [existingBundleId]
        )
        await query(
          db,
          `update bundle_item set deleted_at = now(), updated_at = now() where bundle_id = $1 and deleted_at is null`,
          [existingBundleId]
        )
        await query(
          db,
          `update product_product_bundle_product_bundle set deleted_at = now(), updated_at = now() where bundle_id = $1 and product_id = $2 and deleted_at is null`,
          [existingBundleId, productId]
        )
        await query(
          db,
          `update bundle set deleted_at = now(), updated_at = now() where id = $1 and deleted_at is null`,
          [existingBundleId]
        )
      }

      await query(db, "commit")

      res.json({
        bundle: null,
      })
      return
    }

    const bundleId = existingBundleId ?? id("bun")

    if (existingBundleId) {
      await query(
        db,
        `
          update bundle
          set title = $2, description = $3, is_active = $4, updated_at = now()
          where id = $1
        `,
        [
          bundleId,
          body.title ?? "Bundle",
          body.description ?? null,
          body.is_active ?? true,
        ]
      )
    } else {
      await query(
        db,
        `
          insert into bundle (id, title, description, is_active)
          values ($1, $2, $3, $4)
        `,
        [
          bundleId,
          body.title ?? "Bundle",
          body.description ?? null,
          body.is_active ?? true,
        ]
      )
      await query(
        db,
        `
          insert into product_product_bundle_product_bundle (id, product_id, bundle_id)
          values ($1, $2, $3)
        `,
        [id("pbl"), productId, bundleId]
      )
    }

    await query(
      db,
      `
        update bundle_product_bundle_item_product_product bip
        set deleted_at = now(), updated_at = now()
        where bip.bundle_item_id in (
          select id from bundle_item where bundle_id = $1 and deleted_at is null
        )
      `,
      [bundleId]
    )
    await query(
      db,
      `update bundle_item set deleted_at = now(), updated_at = now() where bundle_id = $1 and deleted_at is null`,
      [bundleId]
    )

    for (const bundledProductId of productIds) {
      const bundleItemId = id("bitem")

      await query(
        db,
        `
          insert into bundle_item
            (id, bundle_id, parent_product_id, item_product_id)
          values ($1, $2, $3, $4)
        `,
        [bundleItemId, bundleId, productId, bundledProductId]
      )
      await query(
        db,
        `
          insert into bundle_product_bundle_item_product_product
            (id, bundle_item_id, product_id)
          values ($1, $2, $3)
        `,
        [id("bipl"), bundleItemId, bundledProductId]
      )
    }

    await query(db, "commit")

    const bundle = await loadBundle(db, productId)

    res.json({
      bundle,
    })
  } catch (error) {
    await query(db, "rollback")
    throw error
  }
}

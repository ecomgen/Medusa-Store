import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260810111500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create or replace view "bundle_product_items_view" as
      select
        b.id as bundle_id,
        b.title as bundle_title,
        b.description as bundle_description,
        b.is_active as bundle_is_active,
        parent.id as parent_product_id,
        parent.title as parent_product_title,
        bi.id as bundle_item_id,
        item.id as item_product_id,
        item.title as item_product_title
      from bundle b
      join product_product_bundle_product_bundle parent_link
        on parent_link.bundle_id = b.id
        and parent_link.deleted_at is null
      join product parent
        on parent.id = parent_link.product_id
        and parent.deleted_at is null
      left join bundle_item bi
        on bi.bundle_id = b.id
        and bi.deleted_at is null
      left join bundle_product_bundle_item_product_product item_link
        on item_link.bundle_item_id = bi.id
        and item_link.deleted_at is null
      left join product item
        on item.id = item_link.product_id
        and item.deleted_at is null
      where b.deleted_at is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop view if exists "bundle_product_items_view";`)
  }
}

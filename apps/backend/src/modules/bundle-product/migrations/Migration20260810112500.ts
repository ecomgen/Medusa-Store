import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260810112500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "bundle_item"
      add column if not exists "parent_product_id" text null,
      add column if not exists "item_product_id" text null;
    `)

    this.addSql(`
      update bundle_item bi
      set
        parent_product_id = parent_link.product_id,
        item_product_id = item_link.product_id
      from product_product_bundle_product_bundle parent_link,
        bundle_product_bundle_item_product_product item_link
      where parent_link.bundle_id = bi.bundle_id
        and parent_link.deleted_at is null
        and item_link.bundle_item_id = bi.id
        and item_link.deleted_at is null
        and bi.deleted_at is null;
    `)

    this.addSql(`
      update bundle_item
      set parent_product_id = '', item_product_id = ''
      where parent_product_id is null or item_product_id is null;
    `)

    this.addSql(`
      alter table if exists "bundle_item"
      alter column "parent_product_id" set not null,
      alter column "item_product_id" set not null;
    `)

    this.addSql(`
      create index if not exists "IDX_bundle_item_parent_product_id"
      on "bundle_item" ("parent_product_id")
      where deleted_at is null;
    `)

    this.addSql(`
      create index if not exists "IDX_bundle_item_item_product_id"
      on "bundle_item" ("item_product_id")
      where deleted_at is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      drop index if exists "IDX_bundle_item_parent_product_id";
    `)
    this.addSql(`
      drop index if exists "IDX_bundle_item_item_product_id";
    `)
    this.addSql(`
      alter table if exists "bundle_item"
      drop column if exists "parent_product_id",
      drop column if exists "item_product_id";
    `)
  }
}

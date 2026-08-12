import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260810124500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table if exists "bundle"
      add column if not exists "parent_product_id" text null;
    `)

    this.addSql(`
      update bundle b
      set parent_product_id = pb.product_id
      from product_product_bundle_product_bundle pb
      where pb.bundle_id = b.id
        and pb.deleted_at is null
        and b.parent_product_id is null
        and b.deleted_at is null;
    `)

    this.addSql(`
      update bundle b
      set parent_product_id = bi.parent_product_id
      from bundle_item bi
      where bi.bundle_id = b.id
        and bi.deleted_at is null
        and b.parent_product_id is null
        and b.deleted_at is null;
    `)

    this.addSql(`
      update bundle
      set parent_product_id = ''
      where parent_product_id is null;
    `)

    this.addSql(`
      alter table if exists "bundle"
      alter column "parent_product_id" set not null;
    `)

    this.addSql(`
      create index if not exists "IDX_bundle_parent_product_id"
      on "bundle" ("parent_product_id")
      where deleted_at is null;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`
      drop index if exists "IDX_bundle_parent_product_id";
    `)

    this.addSql(`
      alter table if exists "bundle"
      drop column if exists "parent_product_id";
    `)
  }
}

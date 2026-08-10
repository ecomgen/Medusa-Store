import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260810104943 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "bundle_item" drop column if exists "title", drop column if exists "quantity";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "bundle_item" add column if not exists "title" text not null, add column if not exists "quantity" integer not null;`);
  }

}

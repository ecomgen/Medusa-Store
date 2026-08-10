import { model } from "@medusajs/framework/utils"
import BundleItem from "./bundle-item"

const Bundle = model.define("bundle", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  is_active: model.boolean().default(true),
  items: model.hasMany(() => BundleItem),
})

export default Bundle
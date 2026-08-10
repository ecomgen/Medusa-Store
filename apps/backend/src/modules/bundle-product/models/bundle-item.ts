import { model } from "@medusajs/framework/utils"
import Bundle from "./bundle"

const BundleItem = model.define("bundle_item", {
  id: model.id().primaryKey(),
  parent_product_id: model.text(),
  item_product_id: model.text(),
  bundle: model.belongsTo(() => Bundle, {
    mappedBy: "items",
  }),
})

export default BundleItem

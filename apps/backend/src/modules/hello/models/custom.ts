import { model } from "@medusajs/framework/utils"

const Custom = model.define("custom", {
  id: model.id().primaryKey(),
  custom_name: model.text(),
})

export default Custom

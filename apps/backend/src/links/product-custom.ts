import { defineLink } from "@medusajs/framework/utils"
import HelloModule from "../modules/hello"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  ProductModule.linkable.product,
  HelloModule.linkable.custom
)
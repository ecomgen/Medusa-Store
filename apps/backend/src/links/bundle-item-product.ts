import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BundleProductModule from "../modules/bundle-product"

export default defineLink(
  BundleProductModule.linkable.bundleItem,
  ProductModule.linkable.product
)

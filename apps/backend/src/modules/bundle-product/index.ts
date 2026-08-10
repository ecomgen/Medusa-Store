import { Module } from "@medusajs/framework/utils"
import BundleProductModuleService from "./service"

export const BUNDLE_PRODUCT_MODULE = "bundle_product"

export default Module(BUNDLE_PRODUCT_MODULE, {
  service: BundleProductModuleService,
})
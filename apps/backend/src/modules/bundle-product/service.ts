import { MedusaService } from "@medusajs/framework/utils"
import Bundle from "./models/bundle"
import BundleItem from "./models/bundle-item"

class BundleProductModuleService extends MedusaService({
  Bundle,
  BundleItem,
}) {}

export default BundleProductModuleService
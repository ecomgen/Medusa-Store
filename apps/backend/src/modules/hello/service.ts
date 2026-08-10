import { MedusaService } from "@medusajs/framework/utils"
import Custom from "./models/custom"

class HelloModuleService extends MedusaService({
  Custom,
}) {}

export default HelloModuleService

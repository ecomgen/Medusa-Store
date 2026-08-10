// src/modules/hello/index.ts
import HelloModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const HELLO_MODULE = "hello"

export default Module(HELLO_MODULE, {
  service: HelloModuleService,
})
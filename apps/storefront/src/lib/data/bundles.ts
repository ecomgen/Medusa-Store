"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export type StoreBundleItem = {
  product_id: string
  title: string
  handle: string
  thumbnail: string | null
  variant_id: string | null
}

export type StoreProductBundle = {
  id: string
  title: string
  description: string | null
  is_active: boolean
  items: StoreBundleItem[]
}

export const retrieveProductBundle = async (productId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ bundle: StoreProductBundle | null }>(
      `/store/products/${productId}/bundle`,
      {
        method: "GET",
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ bundle }) => bundle)
    .catch(() => null)
}

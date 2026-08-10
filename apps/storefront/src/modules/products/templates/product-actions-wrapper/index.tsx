import { listProducts } from "@lib/data/products"
import { retrieveProductBundle } from "@lib/data/bundles"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const [product, bundle] = await Promise.all([
    listProducts({
      queryParams: { id: [id] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]),
    retrieveProductBundle(id),
  ])

  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} bundle={bundle} />
}

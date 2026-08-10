import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState } from "react"

type ProductOption = {
  id: string
  title: string
  thumbnail?: string | null
}

type ProductBundleWidgetProps = {
  data?: {
    id: string
  }
}

type BundleResponse = {
  bundle: {
    id: string
    title: string
    description: string | null
    is_active: boolean
    product_ids: string[]
    products: ProductOption[]
  } | null
}

const ProductBundleWidget = ({ data }: ProductBundleWidgetProps) => {
  const productId = data?.id
  const [isBundle, setIsBundle] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")

  const selectedProducts = useMemo(
    () =>
      selectedProductIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is ProductOption => Boolean(product)),
    [products, selectedProductIds]
  )

  useEffect(() => {
    if (!productId) {
      return
    }

    const load = async () => {
      setIsLoading(true)

      try {
        const [productsResponse, bundleResponse] = await Promise.all([
          fetch("/admin/products?limit=100&fields=id,title,thumbnail", {
            credentials: "include",
          }),
          fetch(`/admin/products/${productId}/bundle`, {
            credentials: "include",
          }),
        ])

        const productsData = (await productsResponse.json()) as {
          products: ProductOption[]
        }
        const bundleData = (await bundleResponse.json()) as BundleResponse
        const availableProducts = productsData.products.filter(
          (product) => product.id !== productId
        )

        setProducts(availableProducts)

        if (bundleData.bundle) {
          setIsBundle(true)
          setTitle(bundleData.bundle.title)
          setDescription(bundleData.bundle.description ?? "")
          setIsActive(bundleData.bundle.is_active)
          setSelectedProductIds(bundleData.bundle.product_ids)
        }
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [productId])

  const addProduct = () => {
    if (!selectedProductId) {
      return
    }

    setSelectedProductIds((current) =>
      current.includes(selectedProductId)
        ? current
        : [...current, selectedProductId]
    )
    setSelectedProductId("")
  }

  const removeProduct = (productIdToRemove: string) => {
    setSelectedProductIds((current) =>
      current.filter((id) => id !== productIdToRemove)
    )
  }

  const saveBundle = async () => {
    if (!productId) {
      return
    }

    setIsSaving(true)
    setMessage("")

    try {
      const response = await fetch(`/admin/products/${productId}/bundle`, {
        body: JSON.stringify({
          is_bundle: isBundle,
          title,
          description,
          is_active: isActive,
          product_ids: selectedProductIds,
        }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || "Failed to save bundle")
      }

      const data = (await response.json()) as BundleResponse

      if (data.bundle) {
        setIsBundle(true)
        setTitle(data.bundle.title)
        setDescription(data.bundle.description ?? "")
        setIsActive(data.bundle.is_active)
        setSelectedProductIds(data.bundle.product_ids)
      } else {
        setIsBundle(false)
        setTitle("")
        setDescription("")
        setIsActive(true)
        setSelectedProductIds([])
      }

      setMessage("Saved")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  if (!productId) {
    return null
  }

  return (
    <section className="bg-ui-bg-base border-ui-border-base rounded-lg border">
      <div className="border-ui-border-base flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-ui-fg-base text-lg font-semibold">
            Bundle product
          </h2>
          <p className="text-ui-fg-subtle text-sm">
            Link existing products that should be shown as part of this bundle.
          </p>
        </div>
        <label className="text-ui-fg-base flex items-center gap-2 text-sm font-medium">
          <input
            checked={isBundle}
            disabled={isLoading}
            onChange={(event) => setIsBundle(event.target.checked)}
            type="checkbox"
          />
          This product is a bundle
        </label>
      </div>

      {isBundle && (
        <div className="flex flex-col gap-6 px-6 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-ui-fg-base text-sm font-medium">
                Bundle title
              </span>
              <input
                className="border-ui-border-base bg-ui-bg-field text-ui-fg-base rounded-md border px-3 py-2 text-sm"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Starter kit"
              />
            </label>
            <label className="text-ui-fg-base flex items-end gap-2 text-sm font-medium">
              <input
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                type="checkbox"
              />
              Active
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-ui-fg-base text-sm font-medium">
              Bundle description
            </span>
            <textarea
              className="border-ui-border-base bg-ui-bg-field text-ui-fg-base min-h-24 rounded-md border px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe why this bundle is valuable on the storefront."
            />
          </label>

          <div className="flex flex-col gap-3">
            <h3 className="text-ui-fg-base text-base font-semibold">
              Bundle products
            </h3>
            <div className="flex gap-2">
              <select
                className="border-ui-border-base bg-ui-bg-field text-ui-fg-base min-w-0 flex-1 rounded-md border px-3 py-2 text-sm"
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
              >
                <option value="">Select a product</option>
                {products
                  .filter((product) => !selectedProductIds.includes(product.id))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
              </select>
              <button
                className="border-ui-border-base bg-ui-bg-base text-ui-fg-base rounded-md border px-3 py-2 text-sm font-medium"
                onClick={addProduct}
                type="button"
              >
                Add
              </button>
            </div>

            <div className="border-ui-border-base overflow-hidden rounded-md border">
              {selectedProducts.length > 0 ? (
                <ul className="divide-ui-border-base divide-y">
                  {selectedProducts.map((product) => (
                    <li
                      className="flex items-center justify-between gap-3 px-3 py-2"
                      key={product.id}
                    >
                      <span className="text-ui-fg-base text-sm">
                        {product.title}
                      </span>
                      <button
                        className="text-ui-fg-subtle hover:text-ui-fg-base text-sm"
                        onClick={() => removeProduct(product.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ui-fg-subtle px-3 py-2 text-sm">
                  No products selected.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-ui-border-base flex items-center justify-end gap-3 border-t px-6 py-4">
        {message && <span className="text-ui-fg-subtle text-sm">{message}</span>}
        <button
          className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: isSaving || isLoading ? "#6b7280" : "#2563eb" }}
          disabled={isSaving || isLoading}
          onClick={saveBundle}
          type="button"
        >
          {isSaving ? "Saving..." : "Save bundle"}
        </button>
      </div>
    </section>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductBundleWidget

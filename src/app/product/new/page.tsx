"use client";

import { useState } from "react";
import Header from "../../components/Header";


export default function NewProductPage() {
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [material, setMaterial] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [weight, setWeight] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [madeToOrder, setMadeToOrder] = useState(false);
  const [preparationTime, setPreparationTime] = useState("");
  const [oneOfAKind, setOneOfAKind] = useState(false);
  const [customization, setCustomization] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);

  const [message, setMessage] = useState("");

  const handleImagesChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    setImages(files);
  };

  const handleVideoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    setVideo(file);
  };

const handleSaveProduct = () => {
  setMessage("");

  if (!productName.trim()) {
    setMessage("Product name is required.");
    return;
  }

  if (!description.trim()) {
    setMessage("Product description is required.");
    return;
  }

  if (!category.trim()) {
    setMessage("Category is required.");
    return;
  }

  if (!material.trim()) {
    setMessage("Material is required.");
    return;
  }

  if (!price.trim()) {
    setMessage("Price is required.");
    return;
  }

  if (Number(price) < 0) {
    setMessage("Price cannot be negative.");
    return;
  }

  if (!madeToOrder && !quantity.trim()) {
    setMessage("Quantity is required unless the product is Made to Order.");
    return;
  }

  if (!madeToOrder && Number(quantity) < 0) {
    setMessage("Quantity cannot be negative.");
    return;
  }

  const productSlug = `${productName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
  .replace(/^-+|-+$/g, "")}-${Date.now()}`;

const product = {
  id: `product-${Date.now()}`,
  slug: productSlug,
  artisanSlug: "irth-artisan",
  name: productName.trim(),
  description: description.trim(),
  category,
  material: material.trim(),
  dimensions: dimensions.trim(),
  weight: weight.trim(),
  price: Number(price),
  quantity: madeToOrder ? null : Number(quantity),
  madeToOrder,
  preparationTime: preparationTime.trim(),
  oneOfAKind,
  customization,
  imageNames: images.map((image) => image.name),
  videoName: video ? video.name : null,
  createdAt: new Date().toISOString(),
  status: "pending",
};

  const existingProducts = JSON.parse(
    localStorage.getItem("irth-artisan-products") || "[]"
  );

  const updatedProducts = [...existingProducts, product];

  localStorage.setItem(
    "irth-artisan-products",
    JSON.stringify(updatedProducts)
  );

  setMessage("Product saved successfully.");

  setProductName("");
  setDescription("");
  setCategory("");
  setMaterial("");
  setDimensions("");
  setWeight("");
  setPrice("");
  setQuantity("");
  setMadeToOrder(false);
  setPreparationTime("");
  setOneOfAKind(false);
  setCustomization(false);
  setImages([]);
  setVideo(null);

  setTimeout(() => {
    window.location.href = "/artisan/products";
  }, 800);
};


  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-[var(--container-max)] px-6 py-12 md:py-20">
        <div className="max-w-3xl">
          <a
            href="/artisan/products"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--color-copper)]"
          >
            ← Back to products
          </a>

          <p className="mt-10 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
            Artisan dashboard
          </p>

          <h1 className="mt-3 font-[var(--font-display)] text-5xl font-normal leading-tight text-[var(--color-espresso)] md:text-6xl">
            Add a new product
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            Add the details customers need to discover, understand, and
            purchase your handmade work through IRTH.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {/* Basic information */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Basic information
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Product name
                  </label>

                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Handcrafted Clay Vessel"
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Description
                  </label>

                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the product, its character, and what makes it special."
                    rows={6}
                    className="mt-2 w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  >
                    <option value="">Select category</option>
                    <option value="Pottery">Pottery</option>
                    <option value="Textiles">Textiles</option>
                    <option value="Metalwork">Metalwork</option>
                    <option value="Woodwork">Woodwork</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Basketry">Basketry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Product details */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Product details
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Material
                  </label>

                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="e.g. Natural clay"
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Dimensions
                  </label>

                  <input
                    type="text"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    placeholder="e.g. 30 × 20 × 20 cm"
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Weight
                  </label>

                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 1.5 kg"
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  />
                </div>
              </div>
            </div>

            {/* Pricing and inventory */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Pricing & inventory
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Price (USD)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="85"
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  />
                </div>

                <div>
                  <label className="text-sm text-[var(--text-secondary)]">
                    Quantity available
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={madeToOrder}
                    placeholder="10"
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <label className="mt-6 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={madeToOrder}
                  onChange={(e) => setMadeToOrder(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[var(--color-copper)]"
                />

                <span>
                  <span className="block text-sm font-medium text-[var(--color-espresso)]">
                    Made to Order
                  </span>

                  <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                    This product is created after the customer places an order.
                  </span>
                </span>
              </label>

              {madeToOrder && (
                <div className="mt-5">
                  <label className="text-sm text-[var(--text-secondary)]">
                    Preparation time
                  </label>

                  <input
                    type="text"
                    value={preparationTime}
                    onChange={(e) => setPreparationTime(e.target.value)}
                    placeholder="e.g. 7–10 days"
                    className="mt-2 w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-copper)]"
                  />
                </div>
              )}
            </div>

            {/* Product options */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Product options
              </p>

              <div className="mt-6 space-y-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={oneOfAKind}
                    onChange={(e) => setOneOfAKind(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--color-copper)]"
                  />

                  <span>
                    <span className="block text-sm font-medium text-[var(--color-espresso)]">
                      One of a Kind
                    </span>

                    <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                      This is a unique piece and cannot be reproduced exactly.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={customization}
                    onChange={(e) => setCustomization(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-[var(--color-copper)]"
                  />

                  <span>
                    <span className="block text-sm font-medium text-[var(--color-espresso)]">
                      Customization available
                    </span>

                    <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                      Customers can request available customization options.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Media */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
                Product media
              </p>

              <div className="mt-6">
                <label className="text-sm text-[var(--text-secondary)]">
                  Product images
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImagesChange}
                  className="mt-2 block w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm"
                />

                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Add clear photos showing the product from useful angles.
                </p>

                {images.length > 0 && (
                  <p className="mt-3 text-sm text-[var(--color-olive)]">
                    {images.length} image(s) selected.
                  </p>
                )}
              </div>

              <div className="mt-6">
                <label className="text-sm text-[var(--text-secondary)]">
                  Product video
                </label>

                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="mt-2 block w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--background)] px-4 py-3 text-sm"
                />

                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Maximum duration: 1 minute.
                </p>

                {video && (
                  <p className="mt-3 text-sm text-[var(--color-olive)]">
                    {video.name} selected.
                  </p>
                )}
              </div>
            </div>

            {/* Save */}
            <div className="rounded-[var(--radius-lg)] bg-[var(--color-olive)] p-7">
              <p className="text-sm leading-6 text-[var(--color-ivory)]/80">
                Your product will be saved to your artisan marketplace
                inventory.
              </p>

              <button
                type="button"
                onClick={handleSaveProduct}
                className="mt-5 w-full rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition-colors hover:bg-[var(--color-copper)]"
              >
                Save product
              </button>

              {message && (
                <p className="mt-4 text-sm text-[var(--color-ivory)]">
                  {message}
                </p>
              )}
            </div>
          </div>

          {/* Side information */}
          <aside className="h-fit rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-7 lg:sticky lg:top-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-olive)]">
              Marketplace guidance
            </p>

            <h2 className="mt-4 font-[var(--font-display)] text-2xl text-[var(--color-espresso)]">
              Help customers understand the piece.
            </h2>

            <div className="mt-6 space-y-5 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Use clear product names and descriptions that explain what the
                customer is buying.
              </p>

              <p>
                Include accurate material, dimensions, and weight information
                whenever possible.
              </p>

              <p>
                If the piece is made to order, clearly communicate the expected
                preparation time.
              </p>

              <p>
                Product media should focus on the object and its craft,
                helping customers make an informed purchase.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
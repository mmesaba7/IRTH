"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "../../../../components/Header";

type Product = {
  slug: string;
  artisanSlug: string;
  name: string;
  artisan: string;
  country: string;
  price: number;
  category: string;
  accent: "terracotta" | "olive" | "copper";
  origin: string;
  artisanRole: string;
  objectLabel: string;
  description: string;
  material: string;
  story: string;
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // دالة لجلب المنتج من localStorage
  const loadProduct = () => {
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    const found = storedProducts.find((p) => p.slug === slug);
    setProduct(found || null);
    setLoading(false);
  };

  useEffect(() => {
    loadProduct();
  }, [slug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (product) {
      setProduct({ ...product, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setError("");
    setIsSaving(true);

    if (!product.name || !product.description || !product.price) {
      setError("من فضلك املأ جميع الحقول المطلوبة");
      setIsSaving(false);
      return;
    }

    // نجيب كل المنتجات المخزنة
    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    // نعدل المنتج المطلوب
    const updatedProducts = storedProducts.map((p) =>
      p.slug === slug ? product : p
    );

    localStorage.setItem("irth-artisan-products", JSON.stringify(updatedProducts));

    setIsSaving(false);
    router.push("/artisan/products");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 items-center justify-center">
          <p>جاري التحميل...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Header />
        <div className="flex h-96 flex-col items-center justify-center gap-4">
          <p className="text-lg text-[var(--text-secondary)]">المنتج غير موجود</p>
          <button
            type="button"
            onClick={() => router.push("/artisan/products")}
            className="text-sm text-[var(--color-copper)]"
          >
            العودة للمنتجات
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <Header />

      <section className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-copper)]">
              Artisan Panel
            </p>
            <h1 className="mt-1 font-[var(--font-display)] text-4xl font-normal text-[var(--color-espresso)]">
              ✏️ تعديل المنتج
            </h1>
            <p className="text-[var(--text-secondary)]">
              عدل بيانات المنتج المختار
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          {error && (
            <div className="rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              اسم المنتج *
            </label>
            <input
              type="text"
              name="name"
              value={product.name}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              الوصف *
            </label>
            <textarea
              name="description"
              value={product.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              required
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                التصنيف
              </label>
              <input
                type="text"
                name="category"
                value={product.category}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                الخامة
              </label>
              <input
                type="text"
                name="material"
                value={product.material}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                السعر ($) *
              </label>
              <input
                type="number"
                name="price"
                value={product.price}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                اللون المميز
              </label>
              <select
                name="accent"
                value={product.accent}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              >
                <option value="terracotta">Terracotta</option>
                <option value="olive">Olive</option>
                <option value="copper">Copper</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              بلد المنشأ
            </label>
            <input
              type="text"
              name="origin"
              value={product.origin}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              قصة المنتج
            </label>
            <textarea
              name="story"
              value={product.story}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:opacity-50"
            >
              {isSaving ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/artisan/products")}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-soft)] px-6 py-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
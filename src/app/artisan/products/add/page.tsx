"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../../components/Header";

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
  status: "pending" | "approved" | "rejected";
};

export default function AddProductPage() {
  const router = useRouter();

  const artisanName = "Ahmed Hassan";
  const artisanSlug = "ahmed-hassan";

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    material: "",
    price: "",
    origin: "",
    country: "Egypt",
    accent: "terracotta" as "terracotta" | "olive" | "copper",
    story: "",
    objectLabel: "",
    artisanRole: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.name || !formData.description || !formData.price) {
      setError("من فضلك املأ جميع الحقول المطلوبة");
      setIsLoading(false);
      return;
    }

    const newProduct: Product = {
      slug: `${formData.name.toLowerCase().replace(/ /g, "-")}-${Date.now()}`,
      artisanSlug: artisanSlug,
      name: formData.name,
      artisan: artisanName,
      country: formData.country || "Egypt",
      price: Number(formData.price),
      category: formData.category || "غير مصنف",
      accent: formData.accent || "terracotta",
      origin: formData.origin || formData.country || "Egypt",
      artisanRole: formData.artisanRole || "حرفي",
      objectLabel: formData.objectLabel || "منتج حرفي",
      description: formData.description,
      material: formData.material || "غير محدد",
      story: formData.story || "تمت إضافته بواسطة الحرفي",
      status: "pending",
    };

    const storedProducts: Product[] = JSON.parse(
      localStorage.getItem("irth-artisan-products") || "[]"
    );

    storedProducts.push(newProduct);
    localStorage.setItem("irth-artisan-products", JSON.stringify(storedProducts));

    setIsLoading(false);
    router.push("/artisan/products");
  };

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
              ✨ إضافة منتج جديد
            </h1>
            <p className="text-[var(--text-secondary)]">
              المنتج هيروح للمراجعة قبل النشر على المنصة
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          {error && (
            <div className="rounded-[var(--radius-md)] bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* اسم المنتج */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              اسم المنتج *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="مثال: سجادة يدوية من الصوف"
              required
            />
          </div>

          {/* وصف المنتج */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              الوصف *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="وصف تفصيلي للمنتج..."
              required
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* التصنيف */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                التصنيف
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                placeholder="مثال: سجاد"
              />
            </div>

            {/* الخامة */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                الخامة
              </label>
              <input
                type="text"
                name="material"
                value={formData.material}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                placeholder="مثال: صوف طبيعي"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* السعر */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                السعر ($) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                placeholder="0"
                required
                min="0"
                step="0.01"
              />
            </div>

            {/* بلد المنشأ */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                بلد المنشأ
              </label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                placeholder="مثال: مصر"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* اللون المميز */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                اللون المميز
              </label>
              <select
                name="accent"
                value={formData.accent}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              >
                <option value="terracotta">Terracotta</option>
                <option value="olive">Olive</option>
                <option value="copper">Copper</option>
              </select>
            </div>

            {/* التصنيف الفرعي (Object Label) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
                التصنيف الفرعي
              </label>
              <input
                type="text"
                name="objectLabel"
                value={formData.objectLabel}
                onChange={handleChange}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
                placeholder="مثال: سجاد يدوي"
              />
            </div>
          </div>

          {/* دور الحرفي */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              دور الحرفي
            </label>
            <input
              type="text"
              name="artisanRole"
              value={formData.artisanRole}
              onChange={handleChange}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="مثال: حرفي سجاد"
            />
          </div>

          {/* قصة المنتج */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-espresso)]">
              قصة المنتج
            </label>
            <textarea
              name="story"
              value={formData.story}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-copper)]"
              placeholder="احكي قصة المنتج، مصدره، أو أي تفاصيل ثقافية..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-espresso)] px-6 py-4 text-sm font-medium text-[var(--color-ivory)] transition hover:bg-[var(--color-copper)] disabled:opacity-50"
            >
              {isLoading ? "جاري الحفظ..." : "💾 حفظ المنتج"}
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
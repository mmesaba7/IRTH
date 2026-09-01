import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/cms/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const admin = createAdminClient();

  const [products, artisans, countries, cms] = await Promise.all([
    admin.from("products").select("slug").eq("lifecycle_status", "published"),
    admin.from("artisan_profiles").select("slug").eq("status", "active"),
    admin.from("countries").select("slug").eq("is_active", true),
    admin.rpc("get_published_cms_sitemap_entries"),
  ]);

  const entries: MetadataRoute.Sitemap = [
    "",
    "/crafts",
    "/explore",
    "/countries",
    "/artisans",
    "/blog",
    "/stories",
    "/wholesale",
  ].map((path) => ({ url: `${base}${path}`, changeFrequency: path === "" ? "daily" : "weekly" }));

  for (const row of products.data ?? []) {
    if (row?.slug) entries.push({ url: `${base}/product/${row.slug}`, changeFrequency: "weekly" });
  }
  for (const row of artisans.data ?? []) {
    if (row?.slug) entries.push({ url: `${base}/artisan/${row.slug}`, changeFrequency: "weekly" });
  }
  for (const row of countries.data ?? []) {
    if (row?.slug) entries.push({ url: `${base}/country/${row.slug}`, changeFrequency: "weekly" });
  }

  const cmsRows = Array.isArray(cms.data) ? cms.data as Array<Record<string, unknown>> : [];
  for (const row of cmsRows) {
    const contentType = typeof row.content_type === "string" ? row.content_type : "";
    const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? row.payload as Record<string, unknown>
      : null;
    const slug = typeof payload?.slug === "string" ? payload.slug : null;
    const publishedAt = typeof row.published_at === "string" ? new Date(row.published_at) : undefined;

    if (contentType === "blog_post" && slug) {
      entries.push({ url: `${base}/blog/${slug}`, lastModified: publishedAt, changeFrequency: "monthly" });
    }
    if (contentType === "static_page" && slug) {
      entries.push({ url: `${base}/pages/${slug}`, lastModified: publishedAt, changeFrequency: "monthly" });
    }
  }

  // Help and Contact are published CMS modules with stable public routes in the MVP.
  entries.push(
    { url: `${base}/help`, changeFrequency: "monthly" },
    { url: `${base}/contact`, changeFrequency: "monthly" },
  );

  const unique = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of entries) unique.set(entry.url, entry);
  return [...unique.values()];
}

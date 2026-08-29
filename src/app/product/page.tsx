import { redirect } from "next/navigation";

type LegacyProductPageProps = {
  searchParams: Promise<{ slug?: string | string[] }>;
};

export default async function LegacyProductPage({
  searchParams,
}: LegacyProductPageProps) {
  const params = await searchParams;
  const rawSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const slug = rawSlug?.trim();

  if (!slug) {
    redirect("/crafts");
  }

  redirect(`/product/${encodeURIComponent(slug)}`);
}

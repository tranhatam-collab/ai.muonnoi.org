import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalog";
import { getPosts } from "@/lib/posts";
import { siteUrl } from "@/lib/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, posts] = await Promise.all([getProducts(), getPosts()]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/bai-viet`, changeFrequency: "daily", priority: 0.6 },
    ...products.map((p) => ({ url: `${base}/sach/${p.id}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...posts.map((p) => ({ url: `${base}/bai-viet/${p.slug}`, lastModified: new Date(p.date), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}

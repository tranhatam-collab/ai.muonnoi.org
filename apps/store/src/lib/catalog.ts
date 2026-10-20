import { anonClient } from "./supabase";
import fallback from "@/data/products.json";

export type Product = {
  id: string;
  title: string;
  title_en: string | null;
  subtitle: string | null;
  author: string;
  lang: "vi" | "en";
  description_md: string | null;
  price_vnd: number | null;
  price_usd: number | null;
  file_path: string | null;
  bundle_items: string[] | null;
  words: number | null;
  cover_color: string | null;
  sort_order: number;
  active: boolean;
};

const fallbackProducts = (fallback as Product[]).filter((p) => p.active);

function sortProducts(list: Product[]): Product[] {
  return [...list].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "vi"));
}

/** Danh mục sách đang bán. Lấy từ Supabase; nếu chưa cấu hình hoặc lỗi thì dùng bản JSON trong repo. */
export async function getProducts(): Promise<Product[]> {
  const client = anonClient();
  if (!client) return sortProducts(fallbackProducts);
  try {
    const { data, error } = await client.from("store_products").select("*").eq("active", true);
    if (error || !data || data.length === 0) return sortProducts(fallbackProducts);
    return sortProducts(data as Product[]);
  } catch {
    return sortProducts(fallbackProducts);
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.id === id) ?? null;
}

export function isBundle(p: Product): boolean {
  return Array.isArray(p.bundle_items) && p.bundle_items.length > 0;
}

/** Các sách thực sự được giao cho một sản phẩm (bộ sách thì bung ra từng cuốn). */
export function deliverableIds(p: Product): string[] {
  return isBundle(p) ? (p.bundle_items as string[]) : [p.id];
}

export function displayTitle(p: Product): string {
  return p.lang === "en" && p.title_en ? p.title_en : p.title;
}

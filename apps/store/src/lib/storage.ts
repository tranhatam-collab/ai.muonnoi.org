import { config } from "./env";
import { serviceClient } from "./supabase";
import { deliverableIds, type Product } from "./catalog";

let cache: { at: number; files: Set<string> } | null = null;
const TTL_MS = 60_000;

/** Danh sách file trong kho `ebooks`, cache 60 giây. Trả về null nếu chưa có khóa server. */
export async function listEbookFiles(): Promise<Set<string> | null> {
  const client = serviceClient();
  if (!client) return null;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.files;
  try {
    const { data, error } = await client.storage.from(config.storageBucket).list("", { limit: 1000 });
    if (error || !data) return cache?.files ?? new Set();
    const files = new Set(data.map((f) => f.name));
    cache = { at: Date.now(), files };
    return files;
  } catch {
    return cache?.files ?? new Set();
  }
}

export function invalidateFileCache() {
  cache = null;
}

export function fileFor(productId: string, products: Product[]): string | null {
  const p = products.find((x) => x.id === productId);
  return p?.file_path ?? null;
}

/** Sản phẩm bán được khi mọi file của nó đã nằm trong kho. */
export function isDeliverable(p: Product, products: Product[], files: Set<string> | null): boolean {
  if (!files) return false;
  return deliverableIds(p).every((id) => {
    const path = fileFor(id, products);
    return Boolean(path && files.has(path));
  });
}

export async function downloadEbook(path: string): Promise<{ data: Blob; contentType: string } | null> {
  const client = serviceClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(config.storageBucket).download(path);
  if (error || !data) return null;
  const contentType = path.endsWith(".pdf") ? "application/pdf" : "application/epub+zip";
  return { data, contentType };
}

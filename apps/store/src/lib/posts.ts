import { promises as fs } from "node:fs";
import path from "node:path";
import { marked } from "marked";

export type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  product: string | null;
  body: string;
};

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    meta[key] = value;
  }
  return { meta, body: m[2] };
}

export async function getPosts(): Promise<Post[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(POSTS_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const slug = file.replace(/\.md$/, "");
      return {
        slug,
        title: meta.title ?? slug,
        date: meta.date ?? "1970-01-01",
        description: meta.description ?? "",
        product: meta.product || null,
        body,
      } satisfies Post;
    }),
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

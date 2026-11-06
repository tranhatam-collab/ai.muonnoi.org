import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts, renderMarkdown } from "@/lib/posts";
import { getProduct, displayTitle } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Không tìm thấy" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${siteUrl()}/bai-viet/${post.slug}` },
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.date },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const product = post.product ? await getProduct(post.product) : null;
  return (
    <article className="post">
      <h1>{post.title}</h1>
      <p className="meta">
        <time dateTime={post.date}>{post.date}</time>
      </p>
      <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
      {product ? (
        <div className="cta">
          Bài viết này đi cùng cuốn <Link href={`/sach/${product.id}`}>{displayTitle(product)}</Link>.
        </div>
      ) : null}
    </article>
  );
}

import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import { getPosts } from "@/lib/posts";
import { ProductCard } from "@/components/ProductCard";
import { config } from "@/lib/env";

export const revalidate = 300;

export default async function HomePage() {
  const [products, posts] = await Promise.all([getProducts(), getPosts()]);
  return (
    <>
      <section className="hero">
        <h1>Sách của {config.brand.author}</h1>
        <p>{config.brand.tagline}</p>
      </section>
      <section>
        <div className="grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      {posts.length > 0 ? (
        <section>
          <h2 className="section">Bài viết mới</h2>
          <div className="posts">
            {posts.slice(0, 5).map((post) => (
              <div className="post-item" key={post.slug}>
                <h3>
                  <Link href={`/bai-viet/${post.slug}`}>{post.title}</Link>
                </h3>
                <time dateTime={post.date}>{post.date}</time>
                {post.description ? <p className="sub">{post.description}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

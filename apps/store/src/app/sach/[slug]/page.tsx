import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deliverableIds, displayTitle, getProduct, getProducts, isBundle } from "@/lib/catalog";
import { renderMarkdown } from "@/lib/posts";
import { isDeliverable, listEbookFiles } from "@/lib/storage";
import { features, siteUrl } from "@/lib/env";
import { Cover } from "@/components/Cover";
import { Price } from "@/components/Price";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Không tìm thấy" };
  const title = displayTitle(product);
  const description = (product.description_md ?? "").replace(/[*_#>]/g, "").split("\n")[0].slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl()}/sach/${product.id}` },
    openGraph: { title, description, type: "book", url: `${siteUrl()}/sach/${product.id}` },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((p) => p.id === slug);
  if (!product) notFound();
  const files = features.db ? await listEbookFiles() : null;
  const deliverable = isDeliverable(product, products, files);
  const canBuy = features.checkout && deliverable;
  const title = displayTitle(product);
  const en = product.lang === "en";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    author: { "@type": "Person", name: product.author },
    inLanguage: product.lang,
    bookFormat: "https://schema.org/EBook",
    url: `${siteUrl()}/sach/${product.id}`,
    offers: [
      product.price_vnd ? { "@type": "Offer", priceCurrency: "VND", price: product.price_vnd, availability: canBuy ? "https://schema.org/InStock" : "https://schema.org/PreOrder" } : null,
      product.price_usd ? { "@type": "Offer", priceCurrency: "USD", price: product.price_usd, availability: canBuy ? "https://schema.org/InStock" : "https://schema.org/PreOrder" } : null,
    ].filter(Boolean),
  };

  return (
    <article className="product">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="cover-wrap">
        <Cover product={product} />
      </div>
      <div>
        <h1>{title}</h1>
        {product.subtitle ? <p className="subtitle">{product.subtitle}</p> : null}
        <p className="note">
          {product.author}
          {product.words ? ` · ${product.words.toLocaleString("vi-VN")} ${en ? "words" : "từ"}` : ""}
          {" · EPUB"}
        </p>
        <div className="buybox">
          <Price product={product} big />
          <div style={{ marginTop: 12 }}>
            {canBuy ? (
              <Link className="btn btn-primary" href={`/mua/${product.id}`}>
                {en ? "Buy the ebook" : "Mua sách điện tử"}
              </Link>
            ) : (
              <span className="badge badge-warn">{en ? "Coming soon" : "Sắp mở bán"}</span>
            )}
          </div>
          {isBundle(product) ? (
            <ul className="note" style={{ marginTop: 12 }}>
              {deliverableIds(product).map((id) => {
                const item = products.find((p) => p.id === id);
                return <li key={id}>{item ? <Link href={`/sach/${id}`}>{displayTitle(item)}</Link> : id}</li>;
              })}
            </ul>
          ) : null}
        </div>
        {product.description_md ? <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(product.description_md) }} /> : null}
      </div>
    </article>
  );
}

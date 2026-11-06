import type { Product } from "@/lib/catalog";

export function Cover({ product, lang }: { product: Product; lang?: "vi" | "en" }) {
  const title = (lang ?? product.lang) === "en" && product.title_en ? product.title_en : product.title;
  return (
    <div className="cover" style={{ background: product.cover_color ?? "#1f3a5f" }} aria-hidden="true">
      <div>
        <div className="t">{title}</div>
        {product.subtitle ? <div className="s">{product.subtitle}</div> : null}
      </div>
      <div className="a">{product.author}</div>
    </div>
  );
}

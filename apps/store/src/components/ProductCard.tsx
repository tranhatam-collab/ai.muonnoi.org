import Link from "next/link";
import { displayTitle, isBundle, type Product } from "@/lib/catalog";
import { Cover } from "./Cover";
import { Price } from "./Price";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link className="card" href={`/sach/${product.id}`}>
      <Cover product={product} />
      <div className="body">
        <h3>{displayTitle(product)}</h3>
        {product.subtitle ? <p className="sub">{isBundle(product) ? "Bộ 5 cuốn, giá tiết kiệm" : product.subtitle}</p> : null}
        <Price product={product} />
      </div>
    </Link>
  );
}

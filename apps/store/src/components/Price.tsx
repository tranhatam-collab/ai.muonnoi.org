import type { Product } from "@/lib/catalog";
import { formatUSD, formatVND } from "@/lib/money";

export function Price({ product, big }: { product: Product; big?: boolean }) {
  const primaryVnd = product.lang !== "en";
  const main = primaryVnd ? formatVND(product.price_vnd) : formatUSD(product.price_usd);
  const alt = primaryVnd ? formatUSD(product.price_usd) : formatVND(product.price_vnd);
  return (
    <div className={big ? "price big" : "price"}>
      {main}
      {alt ? <span className="usd">{alt}</span> : null}
    </div>
  );
}

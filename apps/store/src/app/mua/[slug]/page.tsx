import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { displayTitle, getProducts } from "@/lib/catalog";
import { isDeliverable, listEbookFiles } from "@/lib/storage";
import { features } from "@/lib/env";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Price } from "@/components/Price";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: "Thanh toán", robots: { index: false } };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const products = await getProducts();
  const product = products.find((p) => p.id === slug);
  if (!product) notFound();
  const files = features.db ? await listEbookFiles() : null;
  const canBuy = features.checkout && isDeliverable(product, products, files);
  return (
    <div>
      <p className="note">
        <Link href={`/sach/${product.id}`}>← {displayTitle(product)}</Link>
      </p>
      <h1>{product.lang === "en" ? "Checkout" : "Thanh toán"}</h1>
      <Price product={product} big />
      {sp.cancelled ? <p className="note">Bạn đã hủy lần thanh toán trước. Có thể thử lại bên dưới.</p> : null}
      {canBuy ? (
        <CheckoutForm product={product} payos={features.payos && Boolean(product.price_vnd)} paypal={features.paypal && Boolean(product.price_usd)} />
      ) : (
        <p className="note">Sách này chưa mở bán. Vui lòng quay lại sau.</p>
      )}
    </div>
  );
}

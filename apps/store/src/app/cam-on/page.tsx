import type { Metadata } from "next";
import { OrderStatus } from "@/components/OrderStatus";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Đơn hàng", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ThankYouPage({ searchParams }: Props) {
  const sp = await searchParams;
  const code = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  if (!/^\d{10,18}$/.test(code) || !token) {
    return <div className="status">Thiếu mã đơn hàng. Hãy mở lại link trong email xác nhận.</div>;
  }
  return (
    <div>
      <h1>Đơn hàng {code}</h1>
      <OrderStatus code={code} token={token} />
    </div>
  );
}

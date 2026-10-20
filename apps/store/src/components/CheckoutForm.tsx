"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { formatUSD, formatVND } from "@/lib/money";

type Props = { product: Product; payos: boolean; paypal: boolean };

export function CheckoutForm({ product, payos, paypal }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"payos" | "paypal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const en = product.lang === "en";

  async function go(provider: "payos" | "paypal") {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(en ? "Please enter a valid email to receive your book." : "Vui lòng nhập email hợp lệ để nhận sách.");
      return;
    }
    setBusy(provider);
    try {
      const res = await fetch(`/api/checkout/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, email, name }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.location.href = json.url;
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setBusy(null);
    }
  }

  return (
    <div className="form">
      <label>
        {en ? "Email (where we send the book)" : "Email nhận sách"}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" autoComplete="email" required />
      </label>
      <label>
        {en ? "Name (optional)" : "Tên (không bắt buộc)"}
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <div className="actions">
        {payos && product.price_vnd ? (
          <button className="btn btn-primary" disabled={busy !== null} onClick={() => go("payos")}>
            {busy === "payos" ? "Đang tạo mã QR..." : `Chuyển khoản VietQR · ${formatVND(product.price_vnd)}`}
          </button>
        ) : null}
        {paypal && product.price_usd ? (
          <button className="btn btn-secondary" disabled={busy !== null} onClick={() => go("paypal")}>
            {busy === "paypal" ? "Đang chuyển tới PayPal..." : `PayPal · ${formatUSD(product.price_usd)}`}
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      <p className="note">
        {en
          ? "After payment you get the download link on screen and by email. Links stay valid for 72 hours; the order page gives fresh ones."
          : "Sau khi thanh toán, link tải hiện ngay trên màn hình và gửi vào email. Link có hiệu lực 72 giờ; mở lại trang đơn hàng để lấy link mới."}
      </p>
    </div>
  );
}

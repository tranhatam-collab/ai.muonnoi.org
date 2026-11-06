"use client";

import { useState } from "react";

export function ResendForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/orders/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMessage(json.message ?? "Đã gửi.");
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>
        Email đã dùng khi mua
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" autoComplete="email" required />
      </label>
      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Đang gửi..." : "Gửi lại link cho tôi"}
        </button>
      </div>
      {message ? <p className="note">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}

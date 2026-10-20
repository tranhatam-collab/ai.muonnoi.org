"use client";

import { useEffect, useState } from "react";

type Resp = {
  status: string;
  productTitle?: string;
  links?: Array<{ title: string; url: string }>;
  emailSent?: boolean;
  error?: string;
};

export function OrderStatus({ code, token }: { code: string; token: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        const json = (await res.json()) as Resp;
        if (!stop) setData(json);
        if (json.status === "paid" || json.status === "cancelled" || json.error) return;
      } catch {
        /* thử lại */
      }
      if (!stop && tries < 200) setTimeout(() => setTries((t) => t + 1), 3000);
    }
    tick();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, token, tries]);

  if (!data) return <div className="status">Đang kiểm tra đơn hàng {code}...</div>;
  if (data.error) return <div className="status">Không tìm thấy đơn hàng hoặc link không hợp lệ. {data.error}</div>;
  if (data.status === "paid") {
    return (
      <div className="status">
        <h2 style={{ marginTop: 0 }}>Cảm ơn bạn. Sách đã sẵn sàng.</h2>
        <p>{data.productTitle}</p>
        <ul>
          {(data.links ?? []).map((l) => (
            <li key={l.url}>
              <a href={l.url}>Tải: {l.title}</a>
            </li>
          ))}
        </ul>
        <p className="note">{data.emailSent ? "Một bản sao link đã được gửi vào email của bạn." : "Hãy lưu trang này; link tải có hiệu lực 72 giờ."}</p>
      </div>
    );
  }
  if (data.status === "cancelled" || data.status === "expired") {
    return <div className="status">Đơn hàng đã hủy hoặc hết hạn. Bạn có thể quay lại trang sách để tạo đơn mới.</div>;
  }
  return (
    <div className="status">
      <h2 style={{ marginTop: 0 }}>Đang chờ xác nhận thanh toán</h2>
      <p>Đơn {code}. Trang này tự cập nhật vài giây một lần. Với chuyển khoản VietQR, ngân hàng thường báo trong dưới một phút.</p>
      <p className="note">Nếu đã chuyển khoản mà sau 15 phút chưa thấy, gửi email cho tranhatam@gmail.com kèm mã đơn.</p>
    </div>
  );
}

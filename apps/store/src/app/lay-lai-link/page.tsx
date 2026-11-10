import type { Metadata } from "next";
import { ResendForm } from "@/components/ResendForm";

export const metadata: Metadata = { title: "Lấy lại link tải", robots: { index: false } };

export default function ResendPage() {
  return (
    <div>
      <h1>Lấy lại link tải</h1>
      <p>Nhập email bạn đã dùng khi mua. Nếu có đơn đã thanh toán, chúng tôi gửi link mới vào đúng email đó.</p>
      <ResendForm />
    </div>
  );
}

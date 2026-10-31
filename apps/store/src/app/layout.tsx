import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { config, siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: config.brand.name, template: `%s | ${config.brand.name}` },
  description: config.brand.tagline,
  openGraph: { siteName: config.brand.name, locale: "vi_VN", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <header className="site-header">
          <div className="container">
            <Link className="brand" href="/">{config.brand.name}</Link>
            <nav className="nav">
              <Link href="/">Sách</Link>
              <Link href="/bai-viet">Bài viết</Link>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <p>
              © {new Date().getFullYear()} {config.brand.author}. Sách điện tử định dạng EPUB, không khóa DRM, dùng cho mục đích đọc cá nhân.
            </p>
            <p>Thanh toán trong nước qua VietQR (payOS). Thanh toán quốc tế qua PayPal. Liên hệ: tranhatam@gmail.com</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

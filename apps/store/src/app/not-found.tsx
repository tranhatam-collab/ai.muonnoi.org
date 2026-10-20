import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1>Không tìm thấy trang</h1>
      <p>
        <Link href="/">Về trang sách</Link>
      </p>
    </div>
  );
}

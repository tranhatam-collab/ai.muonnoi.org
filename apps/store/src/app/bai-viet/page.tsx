import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/posts";

export const metadata: Metadata = { title: "Bài viết", description: "Ghi chép ngắn quanh các cuốn sách của Trần Hà Tâm." };

export default async function PostsPage() {
  const posts = await getPosts();
  return (
    <div>
      <h1>Bài viết</h1>
      <div className="posts">
        {posts.map((post) => (
          <div className="post-item" key={post.slug}>
            <h3>
              <Link href={`/bai-viet/${post.slug}`}>{post.title}</Link>
            </h3>
            <time dateTime={post.date}>{post.date}</time>
            {post.description ? <p className="sub">{post.description}</p> : null}
          </div>
        ))}
        {posts.length === 0 ? <p className="note">Chưa có bài viết.</p> : null}
      </div>
    </div>
  );
}

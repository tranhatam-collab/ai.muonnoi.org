import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/mua/", "/cam-on"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

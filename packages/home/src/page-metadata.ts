import blogPosts from "./blog-posts.json";

export const SITE_URL = "https://megabyte.space";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/og.jpg`;

export interface PageMetadata {
  path: string;
  title: string;
  description: string;
  type: "website" | "article";
  image: string;
  imageAlt: string;
  published?: string;
  modified?: string;
  section?: string;
  author?: string;
}

const BLOG_METADATA: PageMetadata = {
  path: "/blog",
  title: "Megabyte Labs Blog — Building Megabyte OS in public",
  description: "Product milestones, engineering notes, and lessons from building Megabyte OS at Megabyte Labs.",
  type: "website",
  image: DEFAULT_SOCIAL_IMAGE,
  imageAlt: "Megabyte OS — black and cyan wordmark over a WebGL wave field",
};

const ARTICLE_METADATA: PageMetadata[] = blogPosts.map((post) => ({
  path: post.path,
  title: `${post.title} — Megabyte Labs`,
  description: post.description,
  type: "article",
  image: DEFAULT_SOCIAL_IMAGE,
  imageAlt: `Megabyte Labs announcement: ${post.title}`,
  published: post.published,
  modified: post.modified,
  section: post.category,
  author: post.author,
}));

export const BLOG_PAGE_METADATA = [BLOG_METADATA, ...ARTICLE_METADATA] as const;

export function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

export function getBlogPageMetadata(pathname: string): PageMetadata | undefined {
  const path = normalizePath(pathname);
  return BLOG_PAGE_METADATA.find((page) => page.path === path);
}

export function articleStructuredData(metadata: PageMetadata): Record<string, unknown> | undefined {
  if (metadata.type !== "article" || !metadata.published || !metadata.author) return undefined;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: metadata.title.replace(/ — Megabyte Labs$/, ""),
        description: metadata.description,
        image: metadata.image,
        datePublished: metadata.published,
        dateModified: metadata.modified ?? metadata.published,
        mainEntityOfPage: `${SITE_URL}${metadata.path}`,
        author: { "@type": "Organization", name: metadata.author, url: SITE_URL },
        publisher: { "@type": "Organization", name: "Megabyte Labs", url: SITE_URL },
        articleSection: metadata.section,
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: metadata.section ?? "Article" },
        ],
      },
    ],
  };
}

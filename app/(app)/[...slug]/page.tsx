import type { Metadata } from "next";
import { DocView } from "@/components/doc-view";
import { CONTENT_DOCS } from "@/content/_generated/content";
import { docDescription } from "@/lib/seo/doc-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const doc = CONTENT_DOCS[path];
  if (!doc) return { title: "Not found", robots: { index: false, follow: false } };

  // DOC-B-008: gated tiers never emit body-derived prose in the server-rendered metadata.
  const description = docDescription(doc);
  const isPublic = doc.tier === "public";
  return {
    title: doc.title,
    description,
    alternates: { canonical: path },
    // Only public docs are indexed; gated tiers are kept out of search.
    robots: isPublic ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: `${doc.title} · Citrate Atlas`, description, url: path, type: "article" },
    twitter: { card: "summary_large_image", title: `${doc.title} · Citrate Atlas`, description },
  };
}

/** Tier-aware doc route. Fixture slugs are root-level (e.g. /chain/rpc), matched by this catch-all. */
export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <DocView slug={"/" + slug.join("/")} />;
}

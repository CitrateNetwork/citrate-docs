import { DocView } from "@/components/doc-view";

/** Tier-aware doc route. Fixture slugs are root-level (e.g. /chain/rpc), matched by this catch-all. */
export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <DocView slug={"/" + slug.join("/")} />;
}

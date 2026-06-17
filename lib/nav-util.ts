import { NavNode } from "@/prototype/fixtures";

/** Flatten a (already tier-filtered) nav tree to its leaf+group nodes. */
export function flattenNav(nodes: NavNode[]): NavNode[] {
  const out: NavNode[] = [];
  const walk = (ns: NavNode[]) => {
    for (const n of ns) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Find a visible node by slug within a tier-filtered tree (used for the "authored in S6" stub). */
export function findNavBySlug(nodes: NavNode[], slug: string): NavNode | undefined {
  return flattenNav(nodes).find((n) => n.slug === slug);
}

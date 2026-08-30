import type { NormalizedItem } from "../../types/normalizedItem.js";

export function deduplicate(items: NormalizedItem[]): NormalizedItem[] {
  const byIdentity = new Map<string, NormalizedItem>();
  const byCanonicalUrl = new Map<string, NormalizedItem>();

  for (const item of items) {
    const identity = `${item.source}\u0000${item.sourceId}`;
    if (byIdentity.has(identity)) continue;

    const canonicalUrl = canonicalizeUrl(item.url);
    const existing = byCanonicalUrl.get(canonicalUrl);
    if (existing) {
      const duplicates = Array.isArray(existing.metadata.duplicateProvenance) ? existing.metadata.duplicateProvenance : [];
      existing.metadata.duplicateProvenance = [...duplicates, item.provenance];
      continue;
    }

    byIdentity.set(identity, item);
    byCanonicalUrl.set(canonicalUrl, item);
  }
  return [...byIdentity.values()];
}

function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|ref$|source$)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch {
    return value;
  }
}

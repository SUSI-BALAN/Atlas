import { createHash } from "node:crypto";

export const snapshotFields = ["stars","forks","watchers","openIssues","defaultBranch","language","license","archived","visibility","description","topics","sourceUpdatedAt","pushedAt"] as const;
export type SnapshotField = typeof snapshotFields[number];
export type RepositorySnapshot = Partial<Record<Exclude<SnapshotField,"topics">, string|number|boolean|null>> & { topics?: string[] };
export type FieldChange = { previous: unknown; current: unknown; added?: string[]; removed?: string[] };

export function canonicalSnapshot(snapshot: RepositorySnapshot): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of snapshotFields) {
    const value = snapshot[field];
    if (value === undefined) continue;
    result[field] = field === "topics" ? [...new Set((value as string[]).map(v=>v.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
      : field === "sourceUpdatedAt" || field === "pushedAt" ? canonicalDate(value) : value;
  }
  return result;
}
function canonicalDate(value: unknown): unknown { const parsed=value instanceof Date?value:new Date(String(value));return Number.isNaN(parsed.getTime())?value:parsed.toISOString(); }
export function snapshotFingerprint(snapshot: RepositorySnapshot): string { return createHash("sha256").update(JSON.stringify(canonicalSnapshot(snapshot))).digest("hex"); }
export function detectChanges(previous: RepositorySnapshot, current: RepositorySnapshot): { changeTypes: string[]; changes: Record<string,FieldChange> } {
  const before=canonicalSnapshot(previous), after=canonicalSnapshot(current), changes:Record<string,FieldChange>={};
  for(const field of snapshotFields){const a=before[field],b=after[field];if(a===undefined&&b===undefined)continue;
    if(field==="topics"){const old=(a??[]) as string[],now=(b??[]) as string[];const added=now.filter(v=>!old.includes(v)),removed=old.filter(v=>!now.includes(v));if(added.length||removed.length)changes[field]={previous:old,current:now,added,removed};}
    else if(a!==b)changes[field]={previous:a??null,current:b??null};
  }
  return {changeTypes:Object.keys(changes),changes};
}

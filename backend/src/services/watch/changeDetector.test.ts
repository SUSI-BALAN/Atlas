import {describe,expect,it} from "vitest";import {canonicalSnapshot,detectChanges,snapshotFingerprint} from "./changeDetector.js";
describe("change detector",()=>{
 it("creates deterministic fingerprints independent of topic order",()=>expect(snapshotFingerprint({stars:1,topics:["beta","alpha","alpha"]})).toBe(snapshotFingerprint({topics:["alpha","beta"],stars:1})));
 it("returns no changes for equal snapshots",()=>expect(detectChanges({stars:1},{stars:1}).changeTypes).toEqual([]));
 it("reports star values",()=>expect(detectChanges({stars:125},{stars:131}).changes.stars).toEqual({previous:125,current:131}));
 it("reports fork values",()=>expect(detectChanges({forks:2},{forks:3}).changeTypes).toEqual(["forks"]));
 it("reports archived state",()=>expect(detectChanges({archived:false},{archived:true}).changes.archived).toEqual({previous:false,current:true}));
 it("reports description changes",()=>expect(detectChanges({description:"old"},{description:"new"}).changes.description).toEqual({previous:"old",current:"new"}));
 it("reports topic additions and removals",()=>expect(detectChanges({topics:["chatbot","old"]},{topics:["agents","chatbot"]}).changes.topics).toMatchObject({added:["agents"],removed:["old"]}));
 it("ignores fields absent from both snapshots",()=>expect(detectChanges({},{})).toEqual({changeTypes:[],changes:{}}));
 it("distinguishes null from a value",()=>expect(detectChanges({license:null},{license:"MIT"}).changeTypes).toEqual(["license"]));
 it("only retains allowlisted fields",()=>expect(canonicalSnapshot({stars:1,secret:"no"} as never)).toEqual({stars:1}));
 it("normalizes provider strings and Mongo dates identically",()=>expect(snapshotFingerprint({sourceUpdatedAt:"2026-01-02T00:00:00Z"})).toBe(snapshotFingerprint({sourceUpdatedAt:new Date("2026-01-02T00:00:00Z")} as never)));
});

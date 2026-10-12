import {QueryClient,QueryClientProvider} from "@tanstack/react-query";import {cleanup,render,screen} from "@testing-library/react";import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const api=vi.hoisted(()=>({listChanges:vi.fn(),listWatchlists:vi.fn()}));vi.mock("../services/api",()=>api);import {ChangesPage} from "./ChangesPage";
function renderPage(){render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><ChangesPage/></QueryClientProvider>)}
beforeEach(()=>{vi.clearAllMocks();api.listWatchlists.mockResolvedValue({watchlists:[],nextCursor:null,hasMore:false});api.listChanges.mockResolvedValue({changes:[{changeId:"1",watchlistId:"w",watchlistName:"Core",savedId:"s",repositoryName:"atlas/core",source:"github",externalId:"1",detectedAt:"2026-01-01T00:00:00Z",changeTypes:["stars","archived","topics"],changes:{stars:{previous:125,current:131},archived:{previous:false,current:true},topics:{previous:["chatbot"],current:["agents"],added:["agents"],removed:["chatbot"]}}}],nextCursor:null,hasMore:false});});afterEach(cleanup);
describe("ChangesPage",()=>{
 it("renders the repository change timeline",async()=>{renderPage();expect(await screen.findByRole("heading",{name:"atlas/core"})).toBeInTheDocument();expect(screen.getByText(/github · Core/)).toBeInTheDocument();});
 it("renders factual previous and current values",async()=>{renderPage();expect(await screen.findByText("125 → 131")).toBeInTheDocument();expect(screen.getByText("No → Yes")).toBeInTheDocument();});
 it("renders topic additions and removals",async()=>{renderPage();expect(await screen.findByText(/Added: agents/)).toBeInTheDocument();expect(screen.getByText(/Removed: chatbot/)).toBeInTheDocument();});
});

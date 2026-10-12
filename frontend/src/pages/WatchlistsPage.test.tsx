import {QueryClient,QueryClientProvider} from "@tanstack/react-query";import {cleanup,render,screen,waitFor} from "@testing-library/react";import userEvent from "@testing-library/user-event";import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";import {MemoryRouter} from "react-router-dom";
const api=vi.hoisted(()=>({listWatchlists:vi.fn(),createWatchlist:vi.fn(),deleteWatchlist:vi.fn(),updateWatchlist:vi.fn()}));vi.mock("../services/api",()=>api);import {WatchlistsPage} from "./WatchlistsPage";
function renderPage(){const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter><WatchlistsPage/></MemoryRouter></QueryClientProvider>)}
beforeEach(()=>{vi.clearAllMocks();api.listWatchlists.mockResolvedValue({watchlists:[],nextCursor:null,hasMore:false});api.createWatchlist.mockResolvedValue({watchlistId:"1"});});afterEach(cleanup);
describe("WatchlistsPage",()=>{
 it("shows the loading state",()=>{api.listWatchlists.mockReturnValue(new Promise(()=>{}));renderPage();expect(screen.getByText("Loading watchlists…")).toBeInTheDocument();});
 it("shows the empty state",async()=>{renderPage();expect(await screen.findByRole("heading",{name:"No watchlists yet"})).toBeInTheDocument();});
 it("shows the error state",async()=>{api.listWatchlists.mockRejectedValue(new Error("Watchlists unavailable"));renderPage();expect(await screen.findByRole("alert")).toHaveTextContent("Watchlists unavailable");});
 it("creates a watchlist from validated form values",async()=>{renderPage();const user=userEvent.setup();await user.type(screen.getByLabelText("Name"),"Core repos");await user.type(screen.getByLabelText("Description"),"Critical dependencies");await user.click(screen.getByRole("button",{name:"Create watchlist"}));await waitFor(()=>expect(api.createWatchlist).toHaveBeenCalledWith({name:"Core repos",description:"Critical dependencies",enabled:true,checkIntervalMinutes:1440}));});
});

import type {
  ConnectorCapabilities, ConnectorContext, ConnectorHealth, ConnectorItemResult,
  ConnectorSearchRequest, ConnectorSearchResult, FetchItemRequest, RateLimitStatus
} from "./connector.types.js";
import type { RepositorySearchBatch, RepositorySearchRequest, SearchContext } from "../../types/repositorySearch.js";

export interface PlatformConnector {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly homepageUrl: string;
  readonly accessMethod: string;
  readonly enabled: boolean;
  readonly authentication: "anonymous" | "token_configured";
  readonly capabilities: ConnectorCapabilities;

  validateConfig(): Promise<void>;
  search(request: ConnectorSearchRequest, context: ConnectorContext): Promise<ConnectorSearchResult>;
  fetchItem(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult>;
  fetchUpdates(request: FetchItemRequest, context: ConnectorContext): Promise<ConnectorItemResult>;
  getRateLimitStatus(): RateLimitStatus;
  getHealth(): ConnectorHealth;
  searchRepositories(request: RepositorySearchRequest, context: SearchContext): AsyncGenerator<RepositorySearchBatch>;
}

import { ConnectorFactory } from "./connectors/core/connectorFactory.js";
import { ConnectorRegistry } from "./connectors/core/connectorRegistry.js";
import { GitHubClient } from "./connectors/github/github.client.js";
import { GitHubConnector } from "./connectors/github/github.connector.js";
import { env } from "./config/env.js";
import { SearchService } from "./services/search/search.service.js";

export const connectorRegistry = new ConnectorRegistry();
const clientOptions = {
  baseUrl: env.GITHUB_API_BASE_URL,
  apiVersion: env.GITHUB_API_VERSION,
  timeoutMs: env.REQUEST_TIMEOUT_MS,
  ...(env.GITHUB_TOKEN ? { token: env.GITHUB_TOKEN } : {})
};
connectorRegistry.register(new GitHubConnector(new GitHubClient(clientOptions)));

export const connectorFactory = new ConnectorFactory(connectorRegistry);
export const searchService = new SearchService(connectorRegistry, env.SEARCH_CONCURRENCY);

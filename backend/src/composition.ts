import { ConnectorFactory } from "./connectors/core/connectorFactory.js";
import { ConnectorRegistry } from "./connectors/core/connectorRegistry.js";
import { GitHubClient } from "./connectors/github/github.client.js";
import { GitHubConnector } from "./connectors/github/github.connector.js";
import { GitLabClient } from "./connectors/gitlab/gitlab.client.js";
import { GitLabConnector } from "./connectors/gitlab/gitlab.connector.js";
import { ForgeClient } from "./connectors/forge/forge.client.js";
import { ForgeConnector } from "./connectors/forge/forge.connector.js";
import { env } from "./config/env.js";
import { SearchService } from "./services/search/search.service.js";
import { SearchJobService } from "./services/searchJobs/searchJob.service.js";

export const connectorRegistry = new ConnectorRegistry();
const clientOptions = {
  baseUrl: env.GITHUB_API_BASE_URL,
  apiVersion: env.GITHUB_API_VERSION,
  timeoutMs: env.REQUEST_TIMEOUT_MS,
  ...(env.GITHUB_TOKEN ? { token: env.GITHUB_TOKEN } : {})
};
connectorRegistry.register(new GitHubConnector(new GitHubClient(clientOptions), { enabled: env.GITHUB_ENABLED, tokenConfigured: Boolean(env.GITHUB_TOKEN) }));
connectorRegistry.register(new GitLabConnector(new GitLabClient({
  baseUrl: env.GITLAB_API_BASE_URL, timeoutMs: env.REQUEST_TIMEOUT_MS,
  ...(env.GITLAB_TOKEN ? { token: env.GITLAB_TOKEN } : {})
}), { enabled: env.GITLAB_ENABLED, tokenConfigured: Boolean(env.GITLAB_TOKEN), homepageUrl: `${env.GITLAB_BASE_URL.replace(/\/$/, "")}/` }));

const forgeConfigs = [
  { id: "codeberg", name: "Codeberg", homepageUrl: `${env.CODEBERG_BASE_URL.replace(/\/$/, "")}/explore/repos`, baseUrl: env.CODEBERG_API_BASE_URL, token: env.CODEBERG_TOKEN, enabled: env.CODEBERG_ENABLED },
  { id: "gitea", name: "Gitea.com", homepageUrl: `${env.GITEA_BASE_URL.replace(/\/$/, "")}/explore/repos`, baseUrl: env.GITEA_API_BASE_URL, token: env.GITEA_TOKEN, enabled: env.GITEA_ENABLED },
  { id: "forgejo", name: "Forgejo Next", homepageUrl: `${env.FORGEJO_BASE_URL.replace(/\/$/, "")}/explore/repos`, baseUrl: env.FORGEJO_API_BASE_URL, token: env.FORGEJO_TOKEN, enabled: env.FORGEJO_ENABLED }
] as const;

for (const config of forgeConfigs) {
  const client = new ForgeClient({
    connectorId: config.id, providerName: config.name, baseUrl: config.baseUrl, timeoutMs: env.REQUEST_TIMEOUT_MS,
    ...(config.token ? { token: config.token } : {})
  });
  connectorRegistry.register(new ForgeConnector(client, { ...config, tokenConfigured: Boolean(config.token) }));
}

export const connectorFactory = new ConnectorFactory(connectorRegistry);
export const searchService = new SearchService(connectorRegistry, env.SEARCH_CONCURRENCY);
export const searchJobService = new SearchJobService(connectorRegistry, env.SEARCH_CONCURRENCY);

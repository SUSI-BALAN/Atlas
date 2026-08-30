import type { PlatformConnector } from "../../connectors/core/connector.interface.js";
import type { RawConnectorItem } from "../../connectors/core/connector.types.js";
import { logger } from "../../config/logger.js";
import { isDatabaseConnected } from "../../database/mongoose.js";
import { NormalizedItemModel } from "../../models/normalizedItem.model.js";
import { RawItemModel } from "../../models/rawItem.model.js";
import type { NormalizedItem } from "../../types/normalizedItem.js";

export async function persistCollectedItems(
  connector: PlatformConnector,
  items: NormalizedItem[],
  rawItems: RawConnectorItem[],
  requestId: string,
  jobId: string | null
): Promise<void> {
  if (!isDatabaseConnected()) return;
  try {
    const rawReferences = new Map<string, string>();
    for (const raw of rawItems) {
      const document = await RawItemModel.create({
        source: connector.id, sourceId: raw.sourceId, sourceType: raw.sourceType, sourceUrl: raw.sourceUrl,
        connectorVersion: connector.version, requestId, jobId, data: raw.data, collectedAt: new Date()
      });
      rawReferences.set(raw.sourceId, String(document._id));
    }
    await Promise.all(items.map((item) => {
      const { id: _id, createdAt, updatedAt, publishedAt, language, rawDataReference: _rawReference, ...stored } = item;
      return NormalizedItemModel.updateOne(
        { source: item.source, sourceId: item.sourceId },
        {
          $set: {
            ...stored,
            programmingLanguage: language,
            sourceCreatedAt: createdAt ? new Date(createdAt) : null,
            sourceUpdatedAt: updatedAt ? new Date(updatedAt) : null,
            publishedAt: publishedAt ? new Date(publishedAt) : null,
            collectedAt: new Date(item.collectedAt),
            rawDataReference: rawReferences.get(item.sourceId) ?? null
          }
        },
        { upsert: true }
      );
    }));
  } catch (error) {
    logger.error({ err: error, requestId, connector: connector.id }, "Failed to persist collected items");
  }
}

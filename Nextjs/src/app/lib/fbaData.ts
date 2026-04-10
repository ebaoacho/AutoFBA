import { apiFetch } from './http';
import { getSPAPIInventory, type SPAPIInventorySummary } from './spapiApi';

export const RESERVED_SKUS = new Set(['__sp_api_token__']);

export interface SKUConfigLike {
  sku: string;
  current_inventory: number;
}

export function buildInventoryMap(inventorySummaries: SPAPIInventorySummary[] = []) {
  const inventoryMap: Record<string, number> = {};

  for (const summary of inventorySummaries) {
    const sellerSku = summary.sellerSku?.trim();
    if (!sellerSku) continue;
    inventoryMap[sellerSku] = Number(summary.totalQuantity ?? 0);
  }

  return inventoryMap;
}

export function mergeInventoryIntoConfigs<T extends SKUConfigLike>(
  configs: T[],
  inventoryMap: Record<string, number>
): T[] {
  if (!Object.keys(inventoryMap).length) return configs;

  return configs.map((config) =>
    config.sku in inventoryMap
      ? { ...config, current_inventory: inventoryMap[config.sku] }
      : config
  );
}

export async function fetchSkuConfigsWithFBAInventory<T extends SKUConfigLike>() {
  const response = await apiFetch<T[] | { results: T[] }>('/sku-data/all-sku-configs/?history=true');
  const configs = (Array.isArray(response) ? response : response.results ?? []).filter(
    (config) => !RESERVED_SKUS.has(config.sku)
  );

  try {
    const inventoryResponse = await getSPAPIInventory();
    const inventoryMap = buildInventoryMap(inventoryResponse.inventorySummaries ?? []);
    return mergeInventoryIntoConfigs(configs, inventoryMap);
  } catch (error) {
    console.error('SP-API inventory fetch failed', error);
    return configs;
  }
}

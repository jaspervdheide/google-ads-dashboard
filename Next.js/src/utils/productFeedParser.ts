/**
 * Product Feed Parser
 * Fetches and merges data from Channable JSON and XML feeds
 */

import { parseStringPromise } from 'xml2js';
import { serverCache } from './serverCache';
import { ProductLookup, ProductCogs, ProductMasterData } from '@/types/products';

// Feed URLs
const LOOKUP_FEED_URL = 'https://files.channable.com/f1Qb28aXX8nscX-S6YNa8Q==.json';
const COGS_FEED_URL = 'https://files.channable.com/zrOEpd3Ry5BkR5vFkXPqUw==.xml';

// Cache keys and TTL
const CACHE_KEY_LOOKUP = 'channable-product-lookup';
const CACHE_KEY_COGS = 'channable-product-cogs';
const CACHE_KEY_MASTER = 'product-master-data';
const CACHE_TTL = 3600; // 1 hour

/**
 * Fetch and parse the JSON lookup feed (Make/Model/Material)
 */
export async function fetchProductLookup(): Promise<Map<string, ProductLookup>> {
  // Check cache
  const cached = serverCache.get<Map<string, ProductLookup>>(CACHE_KEY_LOOKUP);
  if (cached) return cached;

  try {
    const response = await fetch(LOOKUP_FEED_URL, {
      next: { revalidate: CACHE_TTL }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch lookup feed: ${response.status}`);
    }
    
    const data = await response.json();
    const lookupMap = new Map<string, ProductLookup>();
    
    for (const item of data) {
      const sku = item.SKU;
      if (!sku) continue;
      
      const category = sku.startsWith('TM') ? 'TM' : 'CM';
      
      lookupMap.set(sku, {
        sku,
        make: item.Make || '',
        model: item.Model || '',
        makeModel: item['Make / Model / Type'] || '',
        materialName: item['Material Name'] || '',
        parentSku: item['Parent SKU'] || '',
        category: category as 'CM' | 'TM',
        categoryName: category === 'CM' ? 'Car Mats' : 'Trunk Mats'
      });
    }
    
    // Cache the result
    serverCache.set(CACHE_KEY_LOOKUP, lookupMap, CACHE_TTL);
    
    console.log(`Product Lookup Feed: Loaded ${lookupMap.size} products`);
    return lookupMap;
    
  } catch (error) {
    console.error('Error fetching product lookup feed:', error);
    return new Map();
  }
}

/**
 * Fetch and parse the XML COGS feed
 */
export async function fetchProductCogs(): Promise<Map<string, ProductCogs>> {
  // Check cache
  const cached = serverCache.get<Map<string, ProductCogs>>(CACHE_KEY_COGS);
  if (cached) return cached;

  try {
    const response = await fetch(COGS_FEED_URL, {
      next: { revalidate: CACHE_TTL }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch COGS feed: ${response.status}`);
    }
    
    const xml = await response.text();
    const parsed = await parseStringPromise(xml, {
      explicitArray: false,
      ignoreAttrs: true
    });
    
    const cogsMap = new Map<string, ProductCogs>();
    
    // Handle the RSS structure
    const items = parsed?.rss?.channel?.item;
    if (!items) {
      console.warn('No items found in COGS feed');
      return cogsMap;
    }
    
    // Handle single item or array
    const itemArray = Array.isArray(items) ? items : [items];
    
    for (const item of itemArray) {
      // The XML has namespaced keys like 'pm:sku', 'pm:price_buy', 'g:price'
      const sku = item['pm:sku'] || item['g:id'];
      if (!sku) continue;
      
      const cogs = parseFloat(item['pm:price_buy'] || '0');
      const sellingPrice = parseFloat(item['g:price'] || '0');
      
      cogsMap.set(sku, {
        sku,
        cogs,
        sellingPrice
      });
    }
    
    // Cache the result
    serverCache.set(CACHE_KEY_COGS, cogsMap, CACHE_TTL);
    
    console.log(`Product COGS Feed: Loaded ${cogsMap.size} products`);
    return cogsMap;
    
  } catch (error) {
    console.error('Error fetching product COGS feed:', error);
    return new Map();
  }
}

/**
 * Get merged product master data (lookup + COGS)
 */
export async function getProductMasterData(): Promise<Map<string, ProductMasterData>> {
  // Check cache
  const cached = serverCache.get<Map<string, ProductMasterData>>(CACHE_KEY_MASTER);
  if (cached) {
    console.log('Product Master Data: Returning cached data');
    return cached;
  }

  console.log('Product Master Data: Fetching from feeds...');
  
  // Fetch both feeds in parallel
  const [lookupMap, cogsMap] = await Promise.all([
    fetchProductLookup(),
    fetchProductCogs()
  ]);
  
  // Merge by SKU
  const masterData = new Map<string, ProductMasterData>();
  
  for (const [sku, lookup] of lookupMap) {
    const cogs = cogsMap.get(sku);
    
    const sellingPrice = cogs?.sellingPrice || 0;
    const cogsAmount = cogs?.cogs || 0;
    
    masterData.set(sku, {
      ...lookup,
      cogs: cogsAmount,
      sellingPrice,
      theoreticalMargin: sellingPrice > 0 && cogsAmount > 0
        ? ((sellingPrice - cogsAmount) / sellingPrice) * 100
        : 0
    });
  }
  
  // Also add any SKUs that are in COGS but not in lookup (fallback)
  for (const [sku, cogsData] of cogsMap) {
    if (!masterData.has(sku)) {
      const category = sku.startsWith('TM') ? 'TM' : 'CM';
      
      masterData.set(sku, {
        sku,
        category: category as 'CM' | 'TM',
        categoryName: category === 'CM' ? 'Car Mats' : 'Trunk Mats',
        parentSku: extractParentSku(sku),
        make: '',
        model: '',
        makeModel: '',
        materialName: extractMaterialFromSku(sku),
        cogs: cogsData.cogs,
        sellingPrice: cogsData.sellingPrice,
        theoreticalMargin: cogsData.sellingPrice > 0 && cogsData.cogs > 0
          ? ((cogsData.sellingPrice - cogsData.cogs) / cogsData.sellingPrice) * 100
          : 0
      });
    }
  }
  
  // Cache the merged result
  serverCache.set(CACHE_KEY_MASTER, masterData, CACHE_TTL);
  
  console.log(`Product Master Data: Merged ${masterData.size} products`);
  return masterData;
}

/**
 * Extract parent SKU (vehicle code) from full SKU
 * e.g., CM1000NA -> 1000
 */
function extractParentSku(sku: string): string {
  const match = sku.match(/^(?:CM|TM)(\d{4})/);
  return match ? match[1] : '';
}

/**
 * Extract material code from SKU and return readable name
 * e.g., CM1000NA -> Basic
 */
function extractMaterialFromSku(sku: string): string {
  const materialMap: Record<string, string> = {
    'NA': 'Basic',
    'VE': 'Comfort',
    'LVE': 'Luxury',
    'SX': 'Premium',
    'ER': 'DuoGrip Rubber',
    'TPE': 'Rubber'
  };
  
  const match = sku.match(/^(?:CM|TM)\d{4}([A-Z]+)$/);
  if (match) {
    return materialMap[match[1]] || match[1];
  }
  return '';
}

/**
 * Clear all product feed caches (for manual refresh)
 */
export function clearProductFeedCache(): void {
  serverCache.delete(CACHE_KEY_LOOKUP);
  serverCache.delete(CACHE_KEY_COGS);
  serverCache.delete(CACHE_KEY_MASTER);
  console.log('Product feed caches cleared');
}


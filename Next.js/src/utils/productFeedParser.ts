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
  // Check cache - store as object, convert back to Map
  const cachedObj = serverCache.get<Record<string, ProductLookup>>(CACHE_KEY_LOOKUP);
  if (cachedObj) {
    console.log('Product Lookup Feed: Returning cached data');
    return new Map(Object.entries(cachedObj));
  }

  console.log('Product Lookup Feed: Fetching from URL:', LOOKUP_FEED_URL);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(LOOKUP_FEED_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`Product Lookup Feed: Response status ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch lookup feed: ${response.status} - ${errorText.slice(0, 200)}`);
    }
    
    const text = await response.text();
    console.log(`Product Lookup Feed: Received ${text.length} bytes`);
    
    // Log preview for debugging
    console.log('Product Lookup Feed: Preview:', text.slice(0, 300));
    
    const data = JSON.parse(text);
    console.log(`Product Lookup Feed: Parsed ${Array.isArray(data) ? data.length : 0} items`);
    
    // Log first item for debugging
    if (Array.isArray(data) && data.length > 0) {
      console.log('Product Lookup Feed: First item keys:', Object.keys(data[0]));
    }
    
    const lookupMap = new Map<string, ProductLookup>();
    const lookupObj: Record<string, ProductLookup> = {};
    
    if (!Array.isArray(data)) {
      console.error('Product Lookup Feed: Data is not an array');
      return lookupMap;
    }
    
    for (const item of data) {
      const sku = item.SKU;
      if (!sku) continue;
      
      const category = sku.startsWith('TM') ? 'TM' : 'CM';
      
      const lookupItem: ProductLookup = {
        sku,
        make: item.Make || '',
        model: item.Model || '',
        makeModel: item['Make / Model / Type'] || '',
        materialName: item['Material Name'] || '',
        parentSku: item['Parent SKU'] || '',
        category: category as 'CM' | 'TM',
        categoryName: category === 'CM' ? 'Car Mats' : 'Trunk Mats'
      };
      
      lookupMap.set(sku, lookupItem);
      lookupObj[sku] = lookupItem;
    }
    
    // Cache as object (Maps don't serialize)
    if (lookupMap.size > 0) {
      serverCache.set(CACHE_KEY_LOOKUP, lookupObj, CACHE_TTL);
    }
    
    console.log(`Product Lookup Feed: Loaded ${lookupMap.size} products`);
    return lookupMap;
    
  } catch (error: any) {
    console.error('Error fetching product lookup feed:', error?.message || error);
    return new Map();
  }
}

/**
 * Fetch and parse the XML COGS feed
 */
export async function fetchProductCogs(): Promise<Map<string, ProductCogs>> {
  // Check cache - store as object, convert back to Map
  const cachedObj = serverCache.get<Record<string, ProductCogs>>(CACHE_KEY_COGS);
  if (cachedObj) {
    console.log('Product COGS Feed: Returning cached data');
    return new Map(Object.entries(cachedObj));
  }

  console.log('Product COGS Feed: Fetching from URL:', COGS_FEED_URL);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(COGS_FEED_URL, {
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`Product COGS Feed: Response status ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch COGS feed: ${response.status}`);
    }
    
    const xml = await response.text();
    console.log(`Product COGS Feed: Received ${xml.length} bytes`);
    
    // Log first 500 chars for debugging
    console.log('Product COGS Feed: XML preview:', xml.slice(0, 500));
    
    const parsed = await parseStringPromise(xml, {
      explicitArray: false,
      ignoreAttrs: false, // Keep attributes to debug
      tagNameProcessors: [(name) => name.replace(/:/g, '_')] // Replace : with _ for namespaces
    });
    
    const cogsMap = new Map<string, ProductCogs>();
    const cogsObj: Record<string, ProductCogs> = {};
    
    // Handle the RSS structure
    const items = parsed?.rss?.channel?.item;
    if (!items) {
      console.warn('No items found in COGS feed. Parsed structure:', JSON.stringify(Object.keys(parsed || {})));
      return cogsMap;
    }
    
    // Handle single item or array
    const itemArray = Array.isArray(items) ? items : [items];
    console.log(`Product COGS Feed: Parsing ${itemArray.length} items from XML`);
    
    // Log first item keys for debugging
    if (itemArray.length > 0) {
      console.log('Product COGS Feed: First item keys:', Object.keys(itemArray[0]));
    }
    
    for (const item of itemArray) {
      // Try different namespace patterns
      const sku = item['pm_sku'] || item['g_id'] || item['pm:sku'] || item['g:id'] || item['id'];
      if (!sku) continue;
      
      // Parse price (might be "12.99 EUR" format)
      const priceBuyStr = item['pm_price_buy'] || item['pm:price_buy'] || item['price_buy'] || '0';
      const priceStr = item['g_price'] || item['g:price'] || item['price'] || '0';
      
      const cogs = parseFloat(String(priceBuyStr).replace(/[^0-9.]/g, '')) || 0;
      const sellingPrice = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;
      
      const cogsItem: ProductCogs = {
        sku: String(sku),
        cogs,
        sellingPrice
      };
      
      cogsMap.set(String(sku), cogsItem);
      cogsObj[String(sku)] = cogsItem;
    }
    
    // Cache as object (Maps don't serialize)
    if (cogsMap.size > 0) {
      serverCache.set(CACHE_KEY_COGS, cogsObj, CACHE_TTL);
    }
    
    console.log(`Product COGS Feed: Loaded ${cogsMap.size} products`);
    return cogsMap;
    
  } catch (error: any) {
    console.error('Error fetching product COGS feed:', error?.message || error);
    return new Map();
  }
}

/**
 * Get merged product master data (lookup + COGS)
 */
export async function getProductMasterData(): Promise<Map<string, ProductMasterData>> {
  // Check cache - store as object, convert back to Map
  const cachedObj = serverCache.get<Record<string, ProductMasterData>>(CACHE_KEY_MASTER);
  if (cachedObj) {
    console.log('Product Master Data: Returning cached data');
    return new Map(Object.entries(cachedObj));
  }

  console.log('Product Master Data: Fetching from feeds...');
  
  // Fetch both feeds in parallel
  const [lookupMap, cogsMap] = await Promise.all([
    fetchProductLookup(),
    fetchProductCogs()
  ]);
  
  console.log(`Product Master Data: Lookup has ${lookupMap.size}, COGS has ${cogsMap.size} products`);
  
  // Merge by SKU
  const masterData = new Map<string, ProductMasterData>();
  const masterObj: Record<string, ProductMasterData> = {};
  
  for (const [sku, lookup] of lookupMap) {
    const cogs = cogsMap.get(sku);
    
    const sellingPrice = cogs?.sellingPrice || 0;
    const cogsAmount = cogs?.cogs || 0;
    
    const masterItem: ProductMasterData = {
      ...lookup,
      cogs: cogsAmount,
      sellingPrice,
      theoreticalMargin: sellingPrice > 0 && cogsAmount > 0
        ? ((sellingPrice - cogsAmount) / sellingPrice) * 100
        : 0
    };
    
    masterData.set(sku, masterItem);
    masterObj[sku] = masterItem;
  }
  
  // Also add any SKUs that are in COGS but not in lookup (fallback)
  for (const [sku, cogsData] of cogsMap) {
    if (!masterData.has(sku)) {
      const category = sku.startsWith('TM') ? 'TM' : 'CM';
      
      const masterItem: ProductMasterData = {
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
      };
      
      masterData.set(sku, masterItem);
      masterObj[sku] = masterItem;
    }
  }
  
  // Cache as object (Maps don't serialize)
  serverCache.set(CACHE_KEY_MASTER, masterObj, CACHE_TTL);
  
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


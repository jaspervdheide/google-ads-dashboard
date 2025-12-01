# Google Ads Dashboard - Feature Roadmap

## Overview

This document outlines the planned improvements for the Google Ads Dashboard application, with clear scope definitions, technical requirements, and implementation approaches.

---

## Phase 1: Product Performance Tab (Priority: HIGH)

### 1.1 Feature Description

A dedicated "Products" tab in the sidebar that provides comprehensive product-level analytics, enabling analysis of:
- **SKU Performance**: Revenue, volume, and profitability per SKU
- **Category Analysis**: Performance by product category (CM = Car Mats, TM = Trunk Mats)
- **Vehicle Analysis**: Performance by vehicle type/model
- **Material Analysis**: Performance by material type (NA, VE, LVE, SX, ER, TPE)

### 1.2 SKU Structure Reference

```
[Category][VehicleCode][Material]

Example: CM1000NA
├── CM    = Car Mats (Category)
├── 1000  = Audi 100 (Vehicle Code)
└── NA    = Basic (Material)

Categories:
- CM = Car Mats
- TM = Trunk Mats

Materials:
- NA  = Basic
- VE  = Comfort
- LVE = Luxury
- SX  = Premium
- ER  = DuoGrip
- TPE = TPE
```

### 1.3 Data Sources

| Data Point | Source | Field/URL |
|------------|--------|-----------|
| SKU / Product ID | Google Ads API | `segments.product_item_id` |
| Revenue (Conversion Value) | Google Ads API | `metrics.conversions_value` |
| Volume (Conversions) | Google Ads API | `metrics.conversions` |
| Cost (Ad Spend) | Google Ads API | `metrics.cost_micros` |
| Click/Impression Data | Google Ads API | `metrics.clicks`, `metrics.impressions` |
| **Make** | **Channable JSON Feed** | `Make` field |
| **Model** | **Channable JSON Feed** | `Model` field |
| **Material** | **Channable JSON Feed** | `Material Name` field |
| **Parent SKU** | **Channable JSON Feed** | `Parent SKU` field |
| **COGS** | **Channable XML Feed** | `pm:price_buy` |
| **Selling Price** | **Channable XML Feed** | `g:price` |

### 1.3.1 Channable Feed Integration

We use **two Channable feeds** that are merged by SKU:

#### Feed 1: Product Lookup (JSON) - Make/Model/Material
**URL:** `https://files.channable.com/f1Qb28aXX8nscX-S6YNa8Q==.json`

```json
{
    "SKU": "TM9063NA",
    "Make / Model / Type": "Volkswagen ID.4",
    "Make": "Volkswagen",
    "Model": "ID.4",
    "Material Name": "Basic",
    "Parent SKU": "9063"
}
```

| Field | Description | Example |
|-------|-------------|---------|
| `SKU` | Full SKU code | TM9063NA |
| `Make` | Vehicle manufacturer | Volkswagen, Audi, Range Rover |
| `Model` | Vehicle model | ID.4, A3, Evoque |
| `Material Name` | Material type | Basic, Comfort, Luxury, Premium, DuoGrip Rubber |
| `Parent SKU` | Vehicle code (groups variants) | 9063 |

#### Feed 2: COGS & Pricing (XML)
**URL:** `https://files.channable.com/zrOEpd3Ry5BkR5vFkXPqUw==.xml`

```xml
<item>
    <pm:sku>TM9063NA</pm:sku>
    <pm:price_buy>10.04</pm:price_buy>  <!-- COGS -->
    <g:price>29.95</g:price>             <!-- Selling Price -->
</item>
```

| Field | Description | Example |
|-------|-------------|---------|
| `pm:sku` | SKU (merge key) | TM9063NA |
| `pm:price_buy` | **COGS** (Cost of Goods Sold) | €10.04 |
| `g:price` | Selling price | €29.95 |

#### Merged Product Data Structure
```typescript
interface ProductMasterData {
  sku: string;              // "TM9063NA"
  category: 'CM' | 'TM';    // Extracted from SKU prefix
  categoryName: string;     // "Car Mats" or "Trunk Mats"
  parentSku: string;        // "9063" - groups all materials for same vehicle
  make: string;             // "Volkswagen"
  model: string;            // "ID.4"
  makeModel: string;        // "Volkswagen ID.4"
  materialName: string;     // "Basic"
  cogs: number;             // 10.04
  sellingPrice: number;     // 29.95
  theoreticalMargin: number; // 66.5% ((29.95 - 10.04) / 29.95)
}
```

#### Data Flow
```
┌─────────────────────────┐     ┌─────────────────────────┐
│   JSON Feed (Lookup)    │     │   XML Feed (COGS)       │
│   f1Qb28...json         │     │   zrOEpd...xml          │
├─────────────────────────┤     ├─────────────────────────┤
│ SKU: TM9063NA           │     │ SKU: TM9063NA           │
│ Make: Volkswagen        │     │ COGS: €10.04            │
│ Model: ID.4             │     │ Price: €29.95           │
│ Material: Basic         │     │                         │
│ Parent SKU: 9063        │     │                         │
└───────────┬─────────────┘     └───────────┬─────────────┘
            │                               │
            └───────────┬───────────────────┘
                        │ MERGE BY SKU
                        ▼
            ┌───────────────────────┐
            │  Product Master Data  │
            │  (Cached in memory)   │
            └───────────────────────┘
```

**Caching Strategy:**
- Cache both feeds for 1 hour (products/COGS don't change frequently)
- Store merged data in server memory for fast lookups
- Refresh on-demand via admin button in Settings

### 1.4 Key Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| Revenue | `SUM(conversion_value)` | Total sales value |
| Volume | `COUNT(conversions)` | Number of units sold |
| Ad Spend | `SUM(cost)` | Google Ads cost |
| COGS Total | `SUM(cogs * conversions)` | Cost of goods sold |
| Gross Profit | `Revenue - COGS Total` | Profit before ad spend |
| Net Profit | `Gross Profit - Ad Spend` | Profit after ad spend |
| Gross Margin % | `(Gross Profit / Revenue) * 100` | Margin before ads |
| Net Margin % | `(Net Profit / Revenue) * 100` | Margin after ads |
| ROAS | `Revenue / Ad Spend` | Return on ad spend |
| POAS | `Gross Profit / Ad Spend` | Profit on ad spend |

### 1.5 UI/UX Specification

#### Navigation Changes
- **Add**: "Products" tab in sidebar under Dashboard section (with Package or ShoppingBag icon)
- **Remove**: "MCC Overview" from sidebar (still accessible via globe icon in header)
- Products inherits the **global account selector** and **date range picker** from header

#### Data Flow
```
Header: [Account Selector] [Date Range: Last 30 days ▼]
                    │                    │
                    └────────┬───────────┘
                             │
                             ▼
            Products Tab receives selectedAccount + selectedDateRange
                             │
                             ▼
              /api/products?customerId=XXX&dateRange=30
                             │
                             ▼
             Google Ads shopping_performance_view query
                             │
                             ▼
              Merge with Channable feeds (COGS + Make/Model)
```

#### View Toggles (re-use existing toggle pattern)
```
[ Revenue ] [ Profit ] [ Margin ]  ← Primary metric toggle (affects chart + table sorting)
```

#### Grouping Options
```
Group by: [ SKU ] [ Category ] [ Make ] [ Model ] [ Material ]
```

#### Table Columns (re-use existing table patterns from CampaignTable)
- Product/Group Name
- Make / Model (when grouped by SKU)
- Material
- Impressions
- Clicks
- Cost (Ad Spend)
- Conversions
- Revenue
- COGS Total
- Gross Profit
- Net Profit
- Margin %
- ROAS
- POAS

#### Chart (RE-USE existing Charts component)
- Use the **exact same Charts.tsx component** from Dashboard
- Pass different data based on toggle:
  - Revenue view: Show revenue over time
  - Profit view: Show gross profit over time  
  - Margin view: Show margin % over time
- Support same granularity toggles (Daily/Weekly/Monthly)
- Support same chart type toggles (Line/Bar)

#### Components to RE-USE (DRY)
| Existing Component | Re-use For |
|-------------------|------------|
| `Charts.tsx` | Product performance chart |
| `CampaignTable.tsx` pattern | ProductTable layout |
| `KPICards.tsx` pattern | Product KPI summary |
| `useHistoricalData.ts` pattern | Product historical data |
| `getKpiChartColor` | Chart colors |
| `formatKPIValue` | Value formatting |
| `TableTotalsRow` | Table totals |
| `HoverMetricsChart` | Product hover insights |

### 1.6 API Requirements

#### Google Ads API Queries

**Shopping Product Performance Query:**
```sql
SELECT
  segments.product_item_id,
  segments.product_title,
  segments.product_type_l1,
  segments.product_type_l2,
  segments.product_brand,
  metrics.impressions,
  metrics.clicks,
  metrics.cost_micros,
  metrics.conversions,
  metrics.conversions_value,
  metrics.all_conversions,
  metrics.all_conversions_value
FROM shopping_performance_view
WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
  AND campaign.advertising_channel_type = 'SHOPPING'
ORDER BY metrics.conversions_value DESC
```

**Product Feed Data (for COGS):**
- Option A: Query `product_group_view` with custom labels
- Option B: Fetch from Google Merchant Center API
- Option C: Join with Google Sheets COGS data

### 1.7 Technical Implementation

#### New Files to Create (Minimal - DRY approach)
```
/src/app/api/products/route.ts           # Product performance (Google Ads + COGS merged)
/src/utils/productFeedParser.ts          # Combined JSON + XML feed parser
/src/components/Dashboard/ProductsView.tsx  # Main view (re-uses Charts.tsx)
/src/hooks/useProductData.ts             # Product data hook
/src/types/products.ts                   # Product types
```

#### Files to MODIFY
```
/src/components/Dashboard/Sidebar.tsx    # Add Products, remove MCC Overview
/src/components/Dashboard/PageRouter.tsx # Add products route
```

#### Components to RE-USE (not create new)
```
Charts.tsx           → Pass product data instead of campaign data
KPICards.tsx pattern → Copy structure, not the component
CampaignTable.tsx    → Use as reference for ProductTable patterns
formatters (utils)   → Re-use all existing formatters
```

#### Product Lookup Feed Parser (JSON)
```typescript
// /src/utils/productLookupParser.ts

interface ProductLookup {
  sku: string;
  make: string;
  model: string;
  makeModel: string;
  materialName: string;
  parentSku: string;
  category: 'CM' | 'TM';
  categoryName: string;
}

const LOOKUP_FEED_URL = 'https://files.channable.com/f1Qb28aXX8nscX-S6YNa8Q==.json';

export async function fetchProductLookup(): Promise<Map<string, ProductLookup>> {
  const response = await fetch(LOOKUP_FEED_URL);
  const data = await response.json();
  
  const lookupMap = new Map<string, ProductLookup>();
  
  for (const item of data) {
    const sku = item.SKU;
    const category = sku.startsWith('TM') ? 'TM' : 'CM';
    
    lookupMap.set(sku, {
      sku,
      make: item.Make,
      model: item.Model,
      makeModel: item['Make / Model / Type'],
      materialName: item['Material Name'],
      parentSku: item['Parent SKU'],
      category,
      categoryName: category === 'CM' ? 'Car Mats' : 'Trunk Mats'
    });
  }
  
  return lookupMap;
}
```

#### COGS Feed Parser (XML)
```typescript
// /src/utils/cogsFeedParser.ts
import { parseStringPromise } from 'xml2js';

interface ProductCogs {
  sku: string;
  cogs: number;           // pm:price_buy
  sellingPrice: number;   // g:price
}

const COGS_FEED_URL = 'https://files.channable.com/zrOEpd3Ry5BkR5vFkXPqUw==.xml';

export async function fetchProductCogs(): Promise<Map<string, ProductCogs>> {
  const response = await fetch(COGS_FEED_URL);
  const xml = await response.text();
  const parsed = await parseStringPromise(xml);
  
  const cogsMap = new Map<string, ProductCogs>();
  
  for (const item of parsed.rss.channel[0].item) {
    const sku = item['pm:sku']?.[0] || item['g:id']?.[0];
    
    cogsMap.set(sku, {
      sku,
      cogs: parseFloat(item['pm:price_buy']?.[0] || '0'),
      sellingPrice: parseFloat(item['g:price']?.[0] || '0')
    });
  }
  
  return cogsMap;
}
```

#### Merged Product Master Data
```typescript
// /src/utils/productMasterData.ts
import { fetchProductLookup } from './productLookupParser';
import { fetchProductCogs } from './cogsFeedParser';
import { serverCache } from './serverCache';

interface ProductMasterData {
  sku: string;
  category: 'CM' | 'TM';
  categoryName: string;
  parentSku: string;
  make: string;
  model: string;
  makeModel: string;
  materialName: string;
  cogs: number;
  sellingPrice: number;
  theoreticalMargin: number;
}

const CACHE_KEY = 'product-master-data';
const CACHE_TTL = 3600; // 1 hour

export async function getProductMasterData(): Promise<Map<string, ProductMasterData>> {
  // Check cache first
  let cached = serverCache.get<Map<string, ProductMasterData>>(CACHE_KEY);
  if (cached) return cached;
  
  // Fetch both feeds in parallel
  const [lookupMap, cogsMap] = await Promise.all([
    fetchProductLookup(),
    fetchProductCogs()
  ]);
  
  // Merge by SKU
  const masterData = new Map<string, ProductMasterData>();
  
  for (const [sku, lookup] of lookupMap) {
    const cogs = cogsMap.get(sku);
    
    masterData.set(sku, {
      ...lookup,
      cogs: cogs?.cogs || 0,
      sellingPrice: cogs?.sellingPrice || 0,
      theoreticalMargin: cogs?.sellingPrice && cogs?.cogs 
        ? ((cogs.sellingPrice - cogs.cogs) / cogs.sellingPrice) * 100 
        : 0
    });
  }
  
  // Cache the merged data
  serverCache.set(CACHE_KEY, masterData, CACHE_TTL);
  
  return masterData;
}
```

#### Server-Side Caching
```typescript
// Use existing serverCache utility
import { serverCache } from '@/utils/serverCache';

// Cache feed for 1 hour
const FEED_CACHE_KEY = 'channable-feed';
const FEED_CACHE_TTL = 3600; // 1 hour

export async function getCachedFeed() {
  let feed = serverCache.get(FEED_CACHE_KEY);
  
  if (!feed) {
    feed = await fetchAndParseChannableFeed();
    serverCache.set(FEED_CACHE_KEY, feed, FEED_CACHE_TTL);
  }
  
  return feed;
}
```

### 1.8 Definition of Done

**Navigation:**
- [ ] Products tab visible in sidebar under Dashboard (with icon)
- [ ] MCC Overview removed from sidebar
- [ ] Products page accessible via sidebar click

**Data Integration:**
- [ ] Products data fetched from Google Ads API (shopping_performance_view)
- [ ] Data respects selected account from header
- [ ] Data respects selected date range from header
- [ ] COGS/Make/Model merged from Channable feeds
- [ ] Feed data cached for 1 hour

**Table:**
- [ ] Product performance table with all profit metrics
- [ ] Group by: SKU / Category / Make / Model / Material
- [ ] Sortable columns
- [ ] Pagination (re-use existing pattern)

**Chart (RE-USE Charts.tsx):**
- [ ] Toggle between Revenue / Profit / Margin views
- [ ] Uses existing Charts component with product data
- [ ] Daily/Weekly/Monthly granularity works
- [ ] Line/Bar toggle works

**Insights:**
- [ ] KPI cards showing totals (Revenue, Profit, Margin, ROAS, POAS)
- [ ] Visual indicators for good/bad performance

**Polish:**
- [ ] Loading states (re-use existing skeletons)
- [ ] Error handling
- [ ] Export to CSV
- [ ] Responsive design

### 1.9 Estimated Complexity

| Component | Effort | Notes |
|-----------|--------|-------|
| API Route (Products) | Medium | New GAQL query needed |
| COGS Import | Medium | Google Sheets integration |
| SKU Parser | Low | Regex to extract category/vehicle/material |
| ProductsView Component | High | Complex table + charts |
| Hooks & State | Medium | Similar pattern to existing |
| **Total** | **2-3 weeks** | |

---

## Phase 2: Market Share & Revenue Tracking (Priority: MEDIUM)

### 2.1 Feature Description

A "Market Share" section showing:
- Google Ads conversions over time
- Search volume trends (from Keyword Planner)
- Actual revenue from Exact (via Google Sheets)
- Correlation analysis between ad spend, search volume, and revenue

### 2.2 Data Sources

| Data Point | Source | Integration Method |
|------------|--------|-------------------|
| Google Ads Conversions | Google Ads API | Existing |
| Search Volume | Keyword Planner API | New API route |
| Actual Revenue | Exact Boekhoudpakket | Google Sheets import |
| Historical Data | MySQL Database | Direct connection |

### 2.3 Google Sheets Integration

**Expected Sheet Structure:**
```
| Date       | SKU      | Revenue  | Orders | Source |
|------------|----------|----------|--------|--------|
| 2024-01-01 | CM1000NA | 1250.00  | 25     | Exact  |
| 2024-01-01 | CM1000VE | 890.50   | 12     | Exact  |
```

**API Endpoint:**
```
POST /api/market-share/import
Body: { sheetId: string, range: string }
```

### 2.4 MySQL Database Connection

**Connection Config:**
```typescript
// /src/utils/mysqlClient.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
```

**Revenue Query:**
```sql
SELECT 
  DATE(order_date) as date,
  SUM(total_revenue) as revenue,
  COUNT(*) as orders
FROM orders
WHERE order_date BETWEEN ? AND ?
GROUP BY DATE(order_date)
ORDER BY date;
```

### 2.5 Keyword Planner API

**Note:** Keyword Planner API requires a Google Ads developer token and has usage limits.

```typescript
// Query for historical search volume
const keywordPlanService = customer.keywordPlanIdeaService;

// Get search volume for keywords
const request = {
  customerId: customerId,
  keywordPlanNetwork: 'GOOGLE_SEARCH',
  keywordSeed: {
    keywords: ['car mats', 'auto matten', 'kofferbakmat']
  },
  historicalMetricsOptions: {
    yearMonthRange: {
      start: { year: 2024, month: 1 },
      end: { year: 2024, month: 12 }
    }
  }
};
```

### 2.6 UI Specification

**Chart: Multi-Metric Trend Line**
```
Y-Axis Left:  Revenue (€) / Conversions (#)
Y-Axis Right: Search Volume
X-Axis:       Date

Lines:
- Google Ads Conversions (solid)
- Actual Revenue from Exact (dashed)
- Search Volume (dotted)
```

**KPI Cards:**
- Total Revenue (Exact)
- Google Ads Attributed Revenue
- Attribution Gap (difference)
- Market Share Estimate

### 2.7 Definition of Done

- [ ] Google Sheets import working
- [ ] MySQL connection established (if needed)
- [ ] Search volume data fetched
- [ ] Multi-line chart with all metrics
- [ ] Date range synchronization
- [ ] Attribution gap calculation
- [ ] Settings page for data source configuration

### 2.8 Estimated Complexity

| Component | Effort |
|-----------|--------|
| Google Sheets Integration | Medium |
| MySQL Connection | Medium |
| Keyword Planner API | High (API complexity) |
| Combined Chart | Medium |
| **Total** | **3-4 weeks** |

---

## Phase 3: Competitor Insights (Priority: LOW - Nice to Have)

### 3.1 Feature Description

Display Auction Insights data from Google Ads API:
- Impression Share
- Overlap Rate
- Position Above Rate
- Top of Page Rate
- Outranking Share

### 3.2 API Availability

**Good News:** Auction Insights IS available via the Google Ads API.

**GAQL Query:**
```sql
SELECT
  auction_insights.display_domain,
  metrics.auction_insight_search_impression_share,
  metrics.auction_insight_search_overlap_rate,
  metrics.auction_insight_search_position_above_rate,
  metrics.auction_insight_search_top_impression_percentage,
  metrics.auction_insight_search_absolute_top_impression_percentage,
  metrics.auction_insight_search_outranking_share
FROM auction_insights
WHERE segments.date DURING LAST_30_DAYS
```

**Limitations:**
- Only available for Search and Shopping campaigns
- May not return data for all campaigns
- Requires significant impression volume
- Some metrics may be null

### 3.3 UI Specification

**Competitor Table:**
| Domain | Impr. Share | Overlap | Position Above | Top of Page | Outranking |
|--------|-------------|---------|----------------|-------------|------------|
| You    | 45.2%       | -       | -              | 78.3%       | -          |
| comp1.com | 32.1%    | 65.4%   | 23.1%          | 54.2%       | 41.2%      |

**Trend Chart:**
- Your impression share over time
- Top 3 competitors' impression share

### 3.4 Definition of Done

- [ ] Auction insights API query working
- [ ] Competitor ranking table
- [ ] Impression share trend chart
- [ ] Filter by campaign/ad group
- [ ] Graceful handling when no data available

### 3.5 Estimated Complexity

| Component | Effort |
|-----------|--------|
| API Integration | Medium |
| Data Processing | Low |
| UI Components | Medium |
| **Total** | **1-2 weeks** |

---

## Implementation Priority

```
┌─────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION ROADMAP                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Week 1-3:  [████████████████████] Phase 1: Products Tab    │
│                                                             │
│  Week 4-7:  [████████████████████] Phase 2: Market Share    │
│                                                             │
│  Week 8-9:  [██████████] Phase 3: Competitor Insights       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Dependencies

### New NPM Packages Needed

```json
{
  "googleapis": "^126.0.0",      // Google Sheets API
  "mysql2": "^3.6.0",            // MySQL connection (if needed)
}
```

### Environment Variables

```env
# Google Sheets
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=

# MySQL (optional)
MYSQL_HOST=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=

# Keyword Planner (uses existing Google Ads credentials)
```

### API Endpoints to Create

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/products` | GET | Product performance data |
| `/api/products/cogs` | POST | Import COGS from sheet |
| `/api/products/parse-sku` | GET | SKU breakdown utility |
| `/api/market-share` | GET | Combined revenue data |
| `/api/market-share/import` | POST | Import from Sheets |
| `/api/market-share/search-volume` | GET | Keyword Planner data |
| `/api/auction-insights` | GET | Competitor data |

---

## Open Questions

1. ~~**COGS Data Source**~~: ✅ RESOLVED - Using XML feed (`pm:price_buy` field)
2. ~~**Vehicle Code Mapping**~~: ✅ RESOLVED - Using JSON feed with clean `Make` and `Model` fields
3. **MySQL Access**: Is the MySQL database accessible from Vercel/hosting environment? (for Phase 2)
4. **Search Volume Keywords**: Which keywords should we track? (for Phase 2)
5. **Historical Data**: How far back do we need product performance data? (30 days? 90 days? 1 year?)
6. **Feed Update Frequency**: How often do the Channable feeds update? (affects cache TTL - currently set to 1 hour)

---

## Next Steps

### Phase 1 Implementation Order (DRY Approach)

1. ✅ Create this roadmap document

2. 🔲 **Step 1: Sidebar & Navigation**
   - Add "Products" to sidebar with Package icon
   - Remove "MCC Overview" from sidebar
   - Add route to PageRouter

3. 🔲 **Step 2: Feed Parser Utility**
   - Install `xml2js` package for XML parsing
   - Create `/src/utils/productFeedParser.ts` (fetches both feeds, merges by SKU)
   - Cache merged data in serverCache

4. 🔲 **Step 3: Google Ads Product API**
   - Create `/api/products/route.ts` with `shopping_performance_view` query
   - Accept `customerId` and `dateRange` params (from header selectors)
   - Merge with Channable data
   - Calculate profit metrics

5. 🔲 **Step 4: Products UI (RE-USE existing components)**
   - Create `ProductsView.tsx`
   - RE-USE `Charts.tsx` for performance chart
   - RE-USE table patterns from `CampaignTable.tsx`
   - RE-USE toggle patterns, KPI card patterns
   - Add Revenue/Profit/Margin toggle
   - Add Group by selector

6. 🔲 **Step 5: Polish**
   - Test with different accounts
   - Test with different date ranges
   - CSV export
   - Loading states (re-use existing)

---

## Quick Start Command

To begin Phase 1, run:
```bash
cd Next.js && npm install xml2js @types/xml2js
```

---

*Last Updated: December 1, 2024*
*Author: Development Team*


# Product Calculations & Data Sources

## Overview

This document outlines the calculation logic and data sources used in the Products tab, with special attention to the **ProfitMetrics vs Standard** account distinction.

---

## Account Types

### ProfitMetrics Accounts
These accounts have **ProfitMetrics** integration, meaning `conversion_value` in Google Ads **already represents PROFIT** (Revenue - COGS), not Revenue.

| Account Name | Customer ID | Status |
|--------------|-------------|--------|
| DE - Online Fussmatten | 1946606314 | ✅ ProfitMetrics |
| FR - Tapis Voiture | 7539242704 | ✅ ProfitMetrics |
| NL - Just Carpets | 5756290882 | ✅ ProfitMetrics |

### Standard Accounts
All other accounts use **standard conversion tracking**, where `conversion_value` = Revenue.

---

## Data Sources

### From Google Ads API

| Field | Google Ads Column | Notes |
|-------|-------------------|-------|
| Product ID / SKU | `segments.product_item_id` | May contain prefixes like `shopify_DE_` |
| Product Title | `segments.product_title` | Full product name |
| Impressions | `metrics.impressions` | |
| Clicks | `metrics.clicks` | |
| Cost (Ad Spend) | `metrics.cost_micros` | Divide by 1,000,000 for € |
| Conversions | `metrics.conversions` | Unit count |
| Conversion Value | `metrics.conversions_value` | **See account type!** |

### From Channable Feeds (for Standard Accounts only)

#### JSON Feed - Product Lookup
**URL:** `https://files.channable.com/f1Qb28aXX8nscX-S6YNa8Q==.json`

| Field | Description |
|-------|-------------|
| `SKU` | Product SKU (merge key) |
| `Make` | Vehicle manufacturer |
| `Model` | Vehicle model |
| `Material Name` | Material type |
| `Parent SKU` | Vehicle code (groups variants) |

#### XML Feed - COGS & Pricing
**URL:** `https://files.channable.com/zrOEpd3Ry5BkR5vFkXPqUw==.xml`

| Field | Description |
|-------|-------------|
| `pm:sku` | SKU (merge key) |
| `pm:price_buy` | **COGS** (Cost of Goods Sold) per unit |
| `g:price` | Selling price per unit |

### From Google Ads Custom Columns (Optional)

Custom columns may contain pre-calculated metrics. Use `/api/custom-columns` to list available columns.

---

## Calculations

### For ProfitMetrics Accounts (DE, FR, NL)

```
conversion_value = Profit (Revenue - COGS already subtracted by ProfitMetrics)

┌─────────────────────────────────────────────────────────────┐
│  POAS = conversion_value / cost                             │
│       = profit / ad_spend                                   │
│                                                             │
│  Net Profit = conversion_value - cost                       │
│             = profit - ad_spend                             │
│                                                             │
│  COGS Total = N/A (already subtracted from conversion_value)│
│  Gross Margin = N/A (need original revenue to calculate)    │
│  ROAS = N/A (not meaningful for profit-based tracking)      │
└─────────────────────────────────────────────────────────────┘
```

**UI Labels for ProfitMetrics:**
- First KPI: "Profit" (not "Revenue")
- Hide: COGS, Gross Margin, ROAS columns
- Show: POAS, Net Profit

### For Standard Accounts

```
conversion_value = Revenue

┌─────────────────────────────────────────────────────────────┐
│  COGS Total = cogs_per_unit × conversions                   │
│                                                             │
│  Gross Profit = conversion_value - COGS Total               │
│               = revenue - (cogs × units_sold)               │
│                                                             │
│  Net Profit = Gross Profit - cost                           │
│             = revenue - cogs_total - ad_spend               │
│                                                             │
│  Gross Margin = (Gross Profit / Revenue) × 100              │
│                                                             │
│  Net Margin = (Net Profit / Revenue) × 100                  │
│                                                             │
│  ROAS = Revenue / Ad Spend                                  │
│                                                             │
│  POAS = Gross Profit / Ad Spend                             │
└─────────────────────────────────────────────────────────────┘
```

**UI Labels for Standard:**
- First KPI: "Revenue"
- Show: All columns (COGS, Gross Profit, Net Profit, Margin, ROAS, POAS)

---

## Example Calculations

### ProfitMetrics Account (DE)

```
Product: CM1000VE (Audi 100 Comfort Mat)
Google Ads Data:
  - conversions: 10
  - conversion_value: €300 (this IS the profit, not revenue)
  - cost: €50

Calculations:
  - POAS = 300 / 50 = 6.0
  - Net Profit = 300 - 50 = €250
  - Gross Margin = N/A
  - ROAS = N/A
```

### Standard Account (UK)

```
Product: CM1000VE (Audi 100 Comfort Mat)
Google Ads Data:
  - conversions: 10
  - conversion_value: €500 (this is revenue)
  - cost: €50

Channable Feed Data:
  - cogs: €20 per unit
  - selling_price: €50 per unit

Calculations:
  - COGS Total = €20 × 10 = €200
  - Gross Profit = €500 - €200 = €300
  - Net Profit = €300 - €50 = €250
  - Gross Margin = (300 / 500) × 100 = 60%
  - Net Margin = (250 / 500) × 100 = 50%
  - ROAS = 500 / 50 = 10.0
  - POAS = 300 / 50 = 6.0
```

---

## SKU Matching

Google Ads returns product IDs in various formats. We extract the actual SKU using regex:

```
Input formats (examples):
  - "shopify_DE_12345_CM1000NA"
  - "online_en_DE::CM1000NA"
  - "CM1000NA"

Extraction pattern: /(CM|TM)\d{4}[A-Z0-9]*/

Result: "CM1000NA"
```

This extracted SKU is then matched against Channable feed data.

---

## Aggregation by Group

When grouping products (by Category, Material, Make, Model):

```
For each group:
  impressions    = SUM(product.impressions)
  clicks         = SUM(product.clicks)
  cost           = SUM(product.cost)
  conversions    = SUM(product.conversions)
  conversionsValue = SUM(product.conversionsValue)
  cogsTotal      = SUM(product.cogsTotal)
  grossProfit    = SUM(product.grossProfit)
  netProfit      = SUM(product.netProfit)
  
  # Recalculate derived metrics from aggregated values:
  ctr            = (clicks / impressions) × 100
  avgCpc         = cost / clicks
  conversionRate = (conversions / clicks) × 100
  grossMargin    = (grossProfit / conversionsValue) × 100
  netMargin      = (netProfit / conversionsValue) × 100
  roas           = conversionsValue / cost
  poas           = grossProfit / cost
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Google Ads API                           │
│         shopping_performance_view query                         │
│  (product_item_id, impressions, clicks, cost, conversions...)   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Account Type Check                          │
│         Is customerId in PROFIT_METRICS_ACCOUNTS?               │
└─────────────────┬────────────────────────────┬──────────────────┘
                  │                            │
          YES (ProfitMetrics)           NO (Standard)
                  │                            │
                  ▼                            ▼
┌─────────────────────────────┐  ┌────────────────────────────────┐
│  conversion_value = Profit  │  │  Fetch Channable Feeds         │
│  COGS = N/A                 │  │  - JSON (Make/Model/Material)  │
│  Calculate POAS             │  │  - XML (COGS per SKU)          │
│  Skip margin calculations   │  │  Match by SKU                  │
└─────────────────────────────┘  │  Calculate all metrics         │
                  │              └────────────────────────────────┘
                  │                            │
                  └──────────────┬─────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Products Response                          │
│  { products: [...], totals: {...}, usesProfitMetrics: bool }    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ProductsView UI                          │
│  - Show/hide columns based on usesProfitMetrics                 │
│  - Adjust labels ("Revenue" vs "Profit")                        │
│  - Display info banner for ProfitMetrics accounts               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Google Ads Custom Columns

Some accounts may have **custom columns** with pre-calculated metrics (like Gross Profit Margin).

### Querying Custom Columns

Custom columns require:
1. First, list available columns: `GET /api/custom-columns?customerId=XXX`
2. Get the column resource name
3. Use in GAQL query with the resource name

### API Endpoint

```
GET /api/custom-columns?customerId=1946606314

Response:
{
  "columns": [
    {
      "resourceName": "customers/1946606314/customColumns/123456",
      "id": "123456",
      "name": "Gross Profit Margin",
      "description": "..."
    },
    ...
  ]
}
```

---

## Cache Strategy

| Data | TTL | Notes |
|------|-----|-------|
| Channable JSON Feed | 1 hour | Product attributes don't change often |
| Channable XML Feed | 1 hour | COGS/prices update daily at most |
| Merged Master Data | 1 hour | Derived from above |
| Products API Response | 5 min | Performance data is more dynamic |

---

*Last Updated: December 2, 2024*




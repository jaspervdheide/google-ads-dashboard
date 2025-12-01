/**
 * Product-related TypeScript interfaces
 * For Product Performance Tab functionality
 */

// Product lookup data from JSON feed
export interface ProductLookup {
  sku: string;
  make: string;
  model: string;
  makeModel: string;
  materialName: string;
  parentSku: string;
  category: 'CM' | 'TM';
  categoryName: string;
}

// Product COGS data from XML feed
export interface ProductCogs {
  sku: string;
  cogs: number;
  sellingPrice: number;
}

// Merged product master data
export interface ProductMasterData {
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

// Google Ads product performance data
export interface ProductPerformanceData {
  sku: string;
  title: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  conversionRate: number;
}

// Complete product data (Google Ads + Channable merged)
export interface ProductData extends ProductPerformanceData {
  // From Channable feeds
  category: 'CM' | 'TM';
  categoryName: string;
  parentSku: string;
  make: string;
  model: string;
  makeModel: string;
  materialName: string;
  cogs: number;
  sellingPrice: number;
  
  // Calculated profit metrics
  cogsTotal: number;         // cogs * conversions
  grossProfit: number;       // conversionsValue - cogsTotal
  netProfit: number;         // grossProfit - cost
  grossMargin: number;       // (grossProfit / conversionsValue) * 100
  netMargin: number;         // (netProfit / conversionsValue) * 100
  roas: number;              // conversionsValue / cost
  poas: number;              // grossProfit / cost
}

// Grouped product data (for grouping by category/make/model/material)
export interface GroupedProductData {
  groupName: string;
  groupType: 'category' | 'make' | 'model' | 'material' | 'sku';
  itemCount: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  cogsTotal: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roas: number;
  poas: number;
}

// Product historical data point
export interface ProductHistoricalDataPoint {
  date: string;
  dateFormatted: string;
  revenue: number;
  profit: number;
  margin: number;
  conversions: number;
  cost: number;
}

// API response for products
export interface ProductsApiResponse {
  success: boolean;
  message: string;
  data: {
    products: ProductData[];
    totals: {
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionsValue: number;
      cogsTotal: number;
      grossProfit: number;
      netProfit: number;
      grossMargin: number;
      netMargin: number;
      roas: number;
      poas: number;
    };
  };
  cached: boolean;
}

// Product view state
export interface ProductViewState {
  viewMode: 'revenue' | 'profit' | 'margin';
  groupBy: 'sku' | 'category' | 'make' | 'model' | 'material';
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
}


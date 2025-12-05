import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { getProductMasterData } from '@/utils/productFeedParser';
import { serverCache } from '@/utils/serverCache';
import { ProductData, ProductsApiResponse } from '@/types/products';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';

    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: 'Customer ID is required'
      }, { status: 400 });
    }

    // Calculate date range
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Check profitMetrics param early for cache key
    const profitMetricsParam = searchParams.get('profitMetrics');
    
    // Generate cache key (include profitMetrics to avoid mixing cached data)
    // Added v3 to bust old cache and recalculate trends with fixed date parsing
    const cacheKey = serverCache.generateKey('products-v3', {
      customerId,
      startDate: startDateStr,
      endDate: endDateStr,
      profitMetrics: profitMetricsParam || 'default'
    });

    // Check cache first
    const cachedData = serverCache.get<ProductsApiResponse['data']>(cacheKey);
    if (cachedData) {
      console.log('Products API: Returning cached data');
      const response = NextResponse.json({
        success: true,
        message: 'Product performance data retrieved from cache',
        data: cachedData,
        cached: true
      });
      response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
      return response;
    }

    console.log(`Products API: Fetching data for customer ${customerId} from ${startDateStr} to ${endDateStr}`);

    // ProfitMetrics accounts: conversion_value is already PROFIT (revenue - COGS)
    // profitMetricsParam already extracted above for cache key
    
    // Default ProfitMetrics accounts (fallback if no param provided)
    const DEFAULT_PROFIT_METRICS_ACCOUNTS = [
      '1946606314', // DE - Online Fussmatten
      '7539242704', // FR - Tapis Voiture
      '5756290882', // NL - Just Carpets
    ];
    
    // Use query param if provided, otherwise use defaults
    const usesProfitMetrics = profitMetricsParam !== null 
      ? profitMetricsParam === 'true'
      : DEFAULT_PROFIT_METRICS_ACCOUNTS.includes(customerId);
    
    console.log(`Products API: Account ${customerId} uses ProfitMetrics: ${usesProfitMetrics} (param: ${profitMetricsParam})`);

    // Fetch product master data (from Channable feeds)
    const productMasterData = await getProductMasterData();
    console.log(`Products API: Loaded ${productMasterData.size} products from master data`);

    // Create Google Ads connection
    const { customer } = createGoogleAdsConnection(customerId);

    // Query shopping performance data
    const query = `
      SELECT
        segments.product_item_id,
        segments.product_title,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM shopping_performance_view
      WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        AND metrics.impressions > 0
      ORDER BY metrics.conversions_value DESC
    `;

    const response = await customer.query(query);
    
    // Process results and merge with master data
    const productsMap = new Map<string, ProductData>();
    
    // Debug: Log first few SKUs from Google Ads and check if they exist in master data
    let debugCount = 0;
    let matchCount = 0;
    let noMatchCount = 0;
    
    for (const row of response) {
      const productId = row.segments?.product_item_id;
      if (!productId) continue;
      
      // Extract actual SKU from product ID
      // Google Ads may return formats like:
      // - "shopify_DE_12345_CM1000NA" 
      // - "online_en_DE::CM1000NA"
      // - "CM1000NA" (direct SKU)
      // We need to extract the CM/TM pattern
      const skuMatch = productId.toUpperCase().match(/(CM|TM)\d{4}[A-Z0-9]*/);
      const sku = skuMatch ? skuMatch[0] : productId.toUpperCase();
      
      const impressions = Number(row.metrics?.impressions || 0);
      const clicks = Number(row.metrics?.clicks || 0);
      const costMicros = Number(row.metrics?.cost_micros || 0);
      const conversions = Number(row.metrics?.conversions || 0);
      const conversionsValue = Number(row.metrics?.conversions_value || 0);
      
      // Get master data for this SKU (using uppercase for matching)
      const masterData = productMasterData.get(sku);
      
      // Debug logging
      if (debugCount < 5) {
        console.log(`Products API Debug: productId="${productId}" -> extracted SKU="${sku}" -> masterData: ${masterData ? 'FOUND' : 'NOT FOUND'}`);
        if (masterData) {
          console.log(`  -> Material: ${masterData.materialName}, Make: ${masterData.make}, COGS: ${masterData.cogs}`);
        }
        debugCount++;
      }
      
      if (masterData) {
        matchCount++;
      } else {
        noMatchCount++;
      }
      
      // Calculate metrics
      const cost = costMicros / 1_000_000;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const avgCpc = clicks > 0 ? cost / clicks : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      
      // Calculate profit metrics based on account type
      const cogs = masterData?.cogs || 0;
      const sellingPrice = masterData?.sellingPrice || 0;
      
      let cogsTotal: number;
      let grossProfit: number;
      let netProfit: number;
      let grossMargin: number;
      let netMargin: number;
      let roas: number;
      let poas: number;
      let estimatedRevenue: number;
      
      if (usesProfitMetrics) {
        // ProfitMetrics: conversionsValue IS already the profit (revenue - COGS)
        grossProfit = conversionsValue; // This IS the profit
        netProfit = conversionsValue - cost; // Profit minus ad spend
        
        // Calculate estimated revenue using selling price from Channable
        // This allows us to calculate a meaningful margin
        estimatedRevenue = sellingPrice * conversions;
        cogsTotal = estimatedRevenue > 0 ? estimatedRevenue - conversionsValue : 0; // Reverse calculate COGS from profit
        
        // Now we can calculate margin using estimated revenue
        grossMargin = estimatedRevenue > 0 ? (grossProfit / estimatedRevenue) * 100 : 0;
        netMargin = estimatedRevenue > 0 ? (netProfit / estimatedRevenue) * 100 : 0;
        roas = cost > 0 ? estimatedRevenue / cost : 0; // Estimated ROAS
        poas = cost > 0 ? conversionsValue / cost : 0; // This is what matters for ProfitMetrics
      } else {
        // Normal tracking: conversionsValue is revenue
        estimatedRevenue = conversionsValue; // Revenue IS the conversion value
        cogsTotal = cogs * conversions;
        grossProfit = conversionsValue - cogsTotal;
        netProfit = grossProfit - cost;
        grossMargin = conversionsValue > 0 ? (grossProfit / conversionsValue) * 100 : 0;
        netMargin = conversionsValue > 0 ? (netProfit / conversionsValue) * 100 : 0;
        roas = cost > 0 ? conversionsValue / cost : 0;
        poas = cost > 0 ? grossProfit / cost : 0;
      }
      
      // Aggregate if SKU already exists (multiple entries)
      if (productsMap.has(sku)) {
        const existing = productsMap.get(sku)!;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.cost += cost;
        existing.conversions += conversions;
        existing.conversionsValue += conversionsValue;
        existing.estimatedRevenue = (existing.estimatedRevenue || 0) + estimatedRevenue;
        // Recalculate derived metrics
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.avgCpc = existing.clicks > 0 ? existing.cost / existing.clicks : 0;
        existing.conversionRate = existing.clicks > 0 ? (existing.conversions / existing.clicks) * 100 : 0;
        
        if (usesProfitMetrics) {
          existing.grossProfit = existing.conversionsValue;
          existing.netProfit = existing.conversionsValue - existing.cost;
          existing.cogsTotal = existing.estimatedRevenue > 0 ? existing.estimatedRevenue - existing.conversionsValue : 0;
          existing.grossMargin = existing.estimatedRevenue > 0 ? (existing.grossProfit / existing.estimatedRevenue) * 100 : 0;
          existing.netMargin = existing.estimatedRevenue > 0 ? (existing.netProfit / existing.estimatedRevenue) * 100 : 0;
          existing.roas = existing.cost > 0 ? existing.estimatedRevenue / existing.cost : 0;
          existing.poas = existing.cost > 0 ? existing.conversionsValue / existing.cost : 0;
        } else {
          existing.cogsTotal = existing.cogs * existing.conversions;
          existing.grossProfit = existing.conversionsValue - existing.cogsTotal;
          existing.netProfit = existing.grossProfit - existing.cost;
          existing.grossMargin = existing.conversionsValue > 0 ? (existing.grossProfit / existing.conversionsValue) * 100 : 0;
          existing.netMargin = existing.conversionsValue > 0 ? (existing.netProfit / existing.conversionsValue) * 100 : 0;
          existing.roas = existing.cost > 0 ? existing.conversionsValue / existing.cost : 0;
          existing.poas = existing.cost > 0 ? existing.grossProfit / existing.cost : 0;
        }
      } else {
        productsMap.set(sku, {
          sku,
          title: row.segments?.product_title || productId,
          impressions,
          clicks,
          cost,
          conversions,
          conversionsValue,
          ctr,
          avgCpc,
          conversionRate,
          // From master data
          category: masterData?.category || (sku.startsWith('TM') ? 'TM' : 'CM'),
          categoryName: masterData?.categoryName || (sku.startsWith('TM') ? 'Trunk Mats' : 'Car Mats'),
          parentSku: masterData?.parentSku || '',
          make: masterData?.make || '',
          model: masterData?.model || '',
          makeModel: masterData?.makeModel || '',
          materialName: masterData?.materialName || '',
          cogs,
          sellingPrice,
          estimatedRevenue,
          // Calculated profit metrics
          cogsTotal,
          grossProfit,
          netProfit,
          grossMargin,
          netMargin,
          roas,
          poas
        });
      }
    }
    
    // Convert to array and sort by revenue
    const products = Array.from(productsMap.values())
      .sort((a, b) => b.conversionsValue - a.conversionsValue);
    
    // Calculate totals
    const totals = products.reduce((acc, p) => ({
      impressions: acc.impressions + p.impressions,
      clicks: acc.clicks + p.clicks,
      cost: acc.cost + p.cost,
      conversions: acc.conversions + p.conversions,
      conversionsValue: acc.conversionsValue + p.conversionsValue,
      estimatedRevenue: acc.estimatedRevenue + (p.estimatedRevenue || 0),
      cogsTotal: acc.cogsTotal + p.cogsTotal,
      grossProfit: acc.grossProfit + p.grossProfit,
      netProfit: acc.netProfit + p.netProfit,
      grossMargin: 0, // Will calculate after
      netMargin: 0,
      roas: 0,
      poas: 0
    }), {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionsValue: 0,
      estimatedRevenue: 0,
      cogsTotal: 0,
      grossProfit: 0,
      netProfit: 0,
      grossMargin: 0,
      netMargin: 0,
      roas: 0,
      poas: 0
    });
    
    // Calculate derived totals based on account type
    if (usesProfitMetrics) {
      // For ProfitMetrics: use estimated revenue from selling price to calculate margin
      totals.grossMargin = totals.estimatedRevenue > 0 ? (totals.grossProfit / totals.estimatedRevenue) * 100 : 0;
      totals.netMargin = totals.estimatedRevenue > 0 ? (totals.netProfit / totals.estimatedRevenue) * 100 : 0;
      totals.roas = totals.cost > 0 ? totals.estimatedRevenue / totals.cost : 0; // Estimated ROAS
      totals.poas = totals.cost > 0 ? totals.conversionsValue / totals.cost : 0;
    } else {
      totals.grossMargin = totals.conversionsValue > 0 ? (totals.grossProfit / totals.conversionsValue) * 100 : 0;
      totals.netMargin = totals.conversionsValue > 0 ? (totals.netProfit / totals.conversionsValue) * 100 : 0;
      totals.roas = totals.cost > 0 ? totals.conversionsValue / totals.cost : 0;
      totals.poas = totals.cost > 0 ? totals.grossProfit / totals.cost : 0;
    }

    // Calculate previous period for trends (same length as current period)
    const days = parseInt(dateRange) || 30;
    
    // Parse YYYYMMDD format dates (no hyphens) 
    const parseYYYYMMDD = (dateStr: string): Date => {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-indexed
      const day = parseInt(dateStr.substring(6, 8));
      return new Date(year, month, day);
    };
    
    // Format date as YYYY-MM-DD for Google Ads API
    const formatDateForQuery = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    
    // Parse the current period dates (YYYYMMDD format from getFormattedDateRange)
    const currentStart = parseYYYYMMDD(startDateStr);
    const currentEnd = parseYYYYMMDD(endDateStr);
    
    // Calculate exact period length in days
    const periodLengthMs = currentEnd.getTime() - currentStart.getTime();
    const periodLengthDays = Math.round(periodLengthMs / (1000 * 60 * 60 * 24)) + 1; // +1 because both start and end are inclusive
    
    // Previous period: ends 1 day before current period starts
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);
    
    // Previous period: starts 'periodLengthDays' days before previousEnd
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - periodLengthDays + 1);
    
    // Format for Google Ads API query (YYYY-MM-DD with hyphens)
    const prevStartStr = formatDateForQuery(previousStart);
    const prevEndStr = formatDateForQuery(previousEnd);
    const currentStartFormatted = formatDateForQuery(currentStart);
    const currentEndFormatted = formatDateForQuery(currentEnd);
    
    console.log(`Products API: Current period: ${currentStartFormatted} to ${currentEndFormatted} (${periodLengthDays} days)`);
    console.log(`Products API: Previous period: ${prevStartStr} to ${prevEndStr} (${periodLengthDays} days)`);
    
    // Query previous period data for trends
    let trends = {
      conversionsValue: 0,
      grossProfit: 0,
      netProfit: 0,
      poas: 0,
      cost: 0
    };
    
    try {
      const prevQuery = `
        SELECT
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM shopping_performance_view
        WHERE segments.date BETWEEN '${prevStartStr}' AND '${prevEndStr}'
          AND metrics.impressions > 0
      `;
      
      const prevResponse = await customer.query(prevQuery);
      
      // Calculate previous period totals
      let prevCost = 0;
      let prevConversionsValue = 0;
      let prevConversions = 0;
      
      for (const row of prevResponse) {
        prevCost += Number(row.metrics?.cost_micros || 0) / 1_000_000;
        prevConversionsValue += Number(row.metrics?.conversions_value || 0);
        prevConversions += Number(row.metrics?.conversions || 0);
      }
      
      // For ProfitMetrics accounts, conversions_value IS the profit
      // For non-PM accounts, we need to estimate gross profit
      const prevGrossProfit = usesProfitMetrics ? prevConversionsValue : prevConversionsValue * 0.5; // Approximate margin
      const prevNetProfit = prevGrossProfit - prevCost;
      const prevPoas = prevCost > 0 ? prevGrossProfit / prevCost : 0;
      
      console.log(`Products API: Previous period totals - Cost: €${prevCost.toFixed(2)}, ConvValue: €${prevConversionsValue.toFixed(2)}, Conversions: ${prevConversions.toFixed(1)}`);
      console.log(`Products API: Current period totals - Cost: €${totals.cost.toFixed(2)}, ConvValue: €${totals.conversionsValue.toFixed(2)}`);
      
      // Calculate percent change for trends
      const calcChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };
      
      trends = {
        conversionsValue: calcChange(totals.conversionsValue, prevConversionsValue),
        grossProfit: calcChange(totals.grossProfit, prevGrossProfit),
        netProfit: calcChange(totals.netProfit, prevNetProfit),
        poas: calcChange(totals.poas, prevPoas),
        cost: calcChange(totals.cost, prevCost)
      };
      
      console.log(`Products API: Calculated trends - ConvValue: ${trends.conversionsValue.toFixed(1)}%, Cost: ${trends.cost.toFixed(1)}%, POAS: ${trends.poas.toFixed(1)}%`);
    } catch (trendError) {
      console.warn('Products API: Could not calculate trends:', trendError);
    }

    const responseData = {
      products,
      totals,
      trends,
      usesProfitMetrics // Include flag in response so UI knows how to label columns
    };

    // Cache the result
    const ttl = serverCache.getSmartTTL(endDateStr, 300); // 5 min default
    serverCache.set(cacheKey, responseData, ttl);

    console.log(`Products API: SKU matching - ${matchCount} matched, ${noMatchCount} not matched (${((matchCount / (matchCount + noMatchCount)) * 100).toFixed(1)}% match rate)`);
    console.log(`Products API: Returning ${products.length} products with trends`);

    const jsonResponse = NextResponse.json({
      success: true,
      message: `Retrieved ${products.length} products with performance data`,
      data: responseData,
      cached: false
    });
    
    jsonResponse.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return jsonResponse;

  } catch (error: any) {
    console.error('Products API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch product performance data',
      error: error.message
    }, { status: 500 });
  }
}


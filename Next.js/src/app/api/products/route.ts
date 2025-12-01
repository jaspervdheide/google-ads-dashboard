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

    // Generate cache key
    const cacheKey = serverCache.generateKey('products', {
      customerId,
      startDate: startDateStr,
      endDate: endDateStr
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
    
    for (const row of response) {
      const sku = row.segments?.product_item_id;
      if (!sku) continue;
      
      const impressions = Number(row.metrics?.impressions || 0);
      const clicks = Number(row.metrics?.clicks || 0);
      const costMicros = Number(row.metrics?.cost_micros || 0);
      const conversions = Number(row.metrics?.conversions || 0);
      const conversionsValue = Number(row.metrics?.conversions_value || 0);
      
      // Get master data for this SKU
      const masterData = productMasterData.get(sku);
      
      // Calculate metrics
      const cost = costMicros / 1_000_000;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const avgCpc = clicks > 0 ? cost / clicks : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      
      // Calculate profit metrics
      const cogs = masterData?.cogs || 0;
      const cogsTotal = cogs * conversions;
      const grossProfit = conversionsValue - cogsTotal;
      const netProfit = grossProfit - cost;
      const grossMargin = conversionsValue > 0 ? (grossProfit / conversionsValue) * 100 : 0;
      const netMargin = conversionsValue > 0 ? (netProfit / conversionsValue) * 100 : 0;
      const roas = cost > 0 ? conversionsValue / cost : 0;
      const poas = cost > 0 ? grossProfit / cost : 0;
      
      // Aggregate if SKU already exists (multiple entries)
      if (productsMap.has(sku)) {
        const existing = productsMap.get(sku)!;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.cost += cost;
        existing.conversions += conversions;
        existing.conversionsValue += conversionsValue;
        // Recalculate derived metrics
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.avgCpc = existing.clicks > 0 ? existing.cost / existing.clicks : 0;
        existing.conversionRate = existing.clicks > 0 ? (existing.conversions / existing.clicks) * 100 : 0;
        existing.cogsTotal = existing.cogs * existing.conversions;
        existing.grossProfit = existing.conversionsValue - existing.cogsTotal;
        existing.netProfit = existing.grossProfit - existing.cost;
        existing.grossMargin = existing.conversionsValue > 0 ? (existing.grossProfit / existing.conversionsValue) * 100 : 0;
        existing.netMargin = existing.conversionsValue > 0 ? (existing.netProfit / existing.conversionsValue) * 100 : 0;
        existing.roas = existing.cost > 0 ? existing.conversionsValue / existing.cost : 0;
        existing.poas = existing.cost > 0 ? existing.grossProfit / existing.cost : 0;
      } else {
        productsMap.set(sku, {
          sku,
          title: row.segments?.product_title || sku,
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
          sellingPrice: masterData?.sellingPrice || 0,
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
      cogsTotal: 0,
      grossProfit: 0,
      netProfit: 0,
      grossMargin: 0,
      netMargin: 0,
      roas: 0,
      poas: 0
    });
    
    // Calculate derived totals
    totals.grossMargin = totals.conversionsValue > 0 ? (totals.grossProfit / totals.conversionsValue) * 100 : 0;
    totals.netMargin = totals.conversionsValue > 0 ? (totals.netProfit / totals.conversionsValue) * 100 : 0;
    totals.roas = totals.cost > 0 ? totals.conversionsValue / totals.cost : 0;
    totals.poas = totals.cost > 0 ? totals.grossProfit / totals.cost : 0;

    const responseData = {
      products,
      totals
    };

    // Cache the result
    const ttl = serverCache.getSmartTTL(endDateStr, 300); // 5 min default
    serverCache.set(cacheKey, responseData, ttl);

    console.log(`Products API: Returning ${products.length} products`);

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


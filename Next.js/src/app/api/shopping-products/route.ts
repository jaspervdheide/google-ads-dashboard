import { NextRequest as _NextRequest } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { handleValidationError, handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { calculateDerivedMetrics, convertCostFromMicros } from '@/utils/apiHelpers';
import { logger } from '@/utils/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';
    
    if (!customerId) {
      return handleValidationError('Customer ID is required');
    }

    console.log(`Fetching shopping products for customer ${customerId} with ${dateRange} days range...`);
    
    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));
    
    // Initialize Google Ads client and customer using utility
    const { customer } = createGoogleAdsConnection(customerId);

    logger.apiStart('Shopping Products', { customerId, dateRange, startDate: startDateStr, endDate: endDateStr });

    // Get all campaigns and filter by name patterns for Shopping and Performance Max
    const campaignsQuery = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign 
      WHERE campaign.status = 'ENABLED'
    `;

    console.log('Fetching all campaigns...');
    const allCampaignResults = await customer.query(campaignsQuery);
    
    // Filter campaigns by name patterns
    const campaignResults = allCampaignResults.filter((row: any) => {
      const campaignName = row.campaign?.name?.toLowerCase();
      if (!campaignName) return false;
      return campaignName.includes('shopping') || 
             campaignName.includes('performance max') || 
             campaignName.includes('performancemax') || 
             campaignName.includes('pmax');
    });
    
    if (campaignResults.length === 0) {
      console.log('No Shopping or Performance Max campaigns found');
      return createSuccessResponse({
        products: [],
        totals: {
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionsValue: 0,
          ctr: 0,
          avgCpc: 0,
          conversionRate: 0,
          cpa: 0,
          roas: 0,
          totalLeadCogs: 0,
          averagePoas: 0
        },
        statistics: {
          total: 0,
          shopping: 0,
          performanceMax: 0
        },
        dateRange: {
          days: parseInt(dateRange),
          startDate: startDateStr,
          endDate: endDateStr
        },
        customerId
      }, 'No Shopping or Performance Max campaigns found');
    }

    console.log(`Found ${campaignResults.length} Shopping/Performance Max campaigns`);

    // Now get shopping product data for each campaign
    const allProducts = new Map();
    
    for (const campaign of campaignResults) {
      if (!campaign.campaign) continue;
      
      const campaignId = campaign.campaign.id;
      const campaignName = campaign.campaign.name;
      
      if (!campaignName) continue;
      
      // Determine campaign type based on name
      const campaignNameLower = campaignName.toLowerCase();
      const isPerformanceMax = campaignNameLower.includes('performance max') || 
                              campaignNameLower.includes('performancemax') || 
                              campaignNameLower.includes('pmax');
      const campaignType = isPerformanceMax ? 'PERFORMANCE_MAX' : 'SHOPPING';
      

      
      try {
        // Query shopping products for this specific campaign
        const shoppingProductsQuery = `
          SELECT 
            segments.product_title,
            segments.product_type_l1,
            segments.product_type_l2,
            segments.product_type_l3,
            segments.product_type_l4,
            segments.product_type_l5,
            segments.product_brand,
            segments.product_item_id,
            segments.product_condition,
            segments.product_country,
            campaign.name,
            campaign.id,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_value,
            metrics.cost_of_goods_sold_micros
          FROM shopping_performance_view
          WHERE campaign.id = ${campaignId}
            AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
            AND metrics.impressions > 0
        `;

        console.log(`Querying shopping products for campaign ${campaignId} (${campaignName})`);
        const productResults = await customer.query(shoppingProductsQuery);
        
        // Process products for this campaign
        productResults.forEach((row: any) => {
          const itemId = row.segments?.product_item_id || 'Unknown';
          const productKey = `${itemId}_${campaignId}`;
          
          // Extract product information
          const productData = {
            itemId: itemId,
            productTitle: row.segments?.product_title || 'Unknown Product',
            productBrand: row.segments?.product_brand || 'Unknown Brand',
            productTypeLevel1: row.segments?.product_type_l1 || '',
            productTypeLevel2: row.segments?.product_type_l2 || '',
            productTypeLevel3: row.segments?.product_type_l3 || '',
            productTypeLevel4: row.segments?.product_type_l4 || '',
            productTypeLevel5: row.segments?.product_type_l5 || '',
            condition: row.segments?.product_condition || 'NEW',
            availability: 'IN_STOCK',
            priceMicros: row.segments?.product_price_micros || 0,
            countryCode: row.segments?.product_country || 'US',
          };
          
          // Extract metrics
          const rawMetrics = {
            impressions: row.metrics?.impressions || 0,
            clicks: row.metrics?.clicks || 0,
            costMicros: row.metrics?.cost_micros || 0,
            conversions: row.metrics?.conversions || 0,
            conversionsValue: row.metrics?.conversions_value || 0,
            cogsMicros: row.metrics?.cost_of_goods_sold_micros || 0,
          };
          
          // Convert campaign type to numeric value
          const campaignTypeNumeric = campaignType === 'PERFORMANCE_MAX' ? 13 : 4;
          
          // For the "All" view: aggregate metrics for same item ID across different campaigns
          // For individual tabs: keep products separate by campaign
          if (allProducts.has(productKey)) {
            // Same item ID in same campaign - aggregate metrics
            const existing = allProducts.get(productKey);
            existing.rawMetrics.impressions += rawMetrics.impressions;
            existing.rawMetrics.clicks += rawMetrics.clicks;
            existing.rawMetrics.costMicros += rawMetrics.costMicros;
            existing.rawMetrics.conversions += rawMetrics.conversions;
            existing.rawMetrics.conversionsValue += rawMetrics.conversionsValue;
            existing.rawMetrics.cogsMicros += rawMetrics.cogsMicros;
          } else {
            // New product entry
            allProducts.set(productKey, {
              id: productKey,
              ...productData,
              campaignId: campaignId,
              campaignName: campaignName,
              campaignType: campaignTypeNumeric,
              campaignTypeDisplay: campaignType === 'PERFORMANCE_MAX' ? 'Performance Max' : 'Shopping',
              rawMetrics: rawMetrics,
            });
            

          }
        });
        
        console.log(`Processed ${productResults.length} products for campaign ${campaignName}`);
        
      } catch (campaignError) {
        console.error(`Error fetching products for campaign ${campaignId}:`, campaignError);
        if (campaignError instanceof Error) {
          console.error('Error message:', campaignError.message);
          console.error('Error stack:', campaignError.stack);
        } else {
          console.error('Error details:', JSON.stringify(campaignError, null, 2));
        }
        // Continue with other campaigns
      }
    }
    
    // Process products using shared utilities for metrics calculations
    const processedProducts = Array.from(allProducts.values()).map(product => {
      const cost = convertCostFromMicros(product.rawMetrics.costMicros);
      const price = convertCostFromMicros(product.priceMicros);
      const cogs = convertCostFromMicros(product.rawMetrics.cogsMicros);
      
      // Use shared utility for metrics calculations
      const derivedMetrics = calculateDerivedMetrics({
        impressions: product.rawMetrics.impressions,
        clicks: product.rawMetrics.clicks,
        cost: cost,
        conversions: product.rawMetrics.conversions,
        conversionsValue: product.rawMetrics.conversionsValue
      });
      
      // Calculate profitability metrics
      const margin = product.rawMetrics.conversionsValue - cogs;
      const marginPercent = product.rawMetrics.conversionsValue > 0 ? (margin / product.rawMetrics.conversionsValue) * 100 : 0;
      const poas = cost > 0 ? margin / cost : 0;
      
      return {
        ...product,
        ...derivedMetrics,
        price: price,
        cogs: cogs,
        margin: margin,
        marginPercent: marginPercent,
        poas: poas,
        // Remove rawMetrics from final output
        rawMetrics: undefined,
      };
    });

    // Calculate totals using shared utility
    const rawTotals = {
      impressions: processedProducts.reduce((sum, p) => sum + p.impressions, 0),
      clicks: processedProducts.reduce((sum, p) => sum + p.clicks, 0),
      cost: processedProducts.reduce((sum, p) => sum + p.cost, 0),
      conversions: processedProducts.reduce((sum, p) => sum + p.conversions, 0),
      conversionsValue: processedProducts.reduce((sum, p) => sum + p.conversionsValue, 0)
    };
    
    const totals: any = calculateDerivedMetrics(rawTotals);
    
    // Add shopping-specific totals with COGS
    const totalCogs = processedProducts.reduce((sum, p) => sum + p.cogs, 0);
    const totalMargin = totals.conversionsValue - totalCogs;
    const avgMarginPercent = totals.conversionsValue > 0 ? (totalMargin / totals.conversionsValue) * 100 : 0;
    const averagePoas = totals.cost > 0 ? totalMargin / totals.cost : 0;
    
    totals.totalCogs = totalCogs;
    totals.totalMargin = totalMargin;
    totals.avgMarginPercent = avgMarginPercent;
    totals.averagePoas = averagePoas;

    // Get campaign type statistics
    const shoppingCount = processedProducts.filter(p => p.campaignType === 4).length;
    const performanceMaxCount = processedProducts.filter(p => p.campaignType === 13).length;

    console.log(`Successfully retrieved ${processedProducts.length} shopping products (${shoppingCount} Shopping, ${performanceMaxCount} Performance Max)`);
    
    const responseData = {
      products: processedProducts,
      totals,
      statistics: {
        total: processedProducts.length,
        shopping: shoppingCount,
        performanceMax: performanceMaxCount
      },
      dateRange: {
        days: parseInt(dateRange),
        startDate: startDateStr,
        endDate: endDateStr
      },
      customerId
    };

    logger.apiComplete('Shopping Products', processedProducts.length);
    return createSuccessResponse(responseData, `✅ Retrieved ${processedProducts.length} shopping products (${shoppingCount} Shopping, ${performanceMaxCount} Performance Max) for ${dateRange} days`);

  } catch (error) {
    return handleApiError(error, 'Shopping Products Data');
  }
} 
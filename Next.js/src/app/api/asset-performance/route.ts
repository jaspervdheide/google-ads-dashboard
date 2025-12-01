import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { serverCache, ServerCache } from '@/utils/serverCache';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get('customerId');
  const dateRange = searchParams.get('dateRange') || '30';
  const adId = searchParams.get('adId');

  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  if (!adId) {
    return NextResponse.json({ error: 'Ad ID is required' }, { status: 400 });
  }

  try {
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Generate cache key
    const cacheKey = serverCache.generateKey('asset-performance', {
      customerId,
      adId,
      startDate: startDateStr,
      endDate: endDateStr
    });

    // Check cache first
    const cachedData = serverCache.get<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: cachedData,
        cached: true,
        timing: { total: Date.now() - startTime }
      });
    }

    const { customer } = createGoogleAdsConnection(customerId);

    // Query for asset-level performance data
    const assetQuery = `
      SELECT
        ad_group_ad_asset_view.ad_group_ad,
        ad_group_ad_asset_view.asset,
        ad_group_ad_asset_view.field_type,
        ad_group_ad_asset_view.performance_label,
        ad_group_ad_asset_view.pinned_field,
        ad_group_ad_asset_view.enabled,
        asset.id,
        asset.type,
        asset.text_asset.text,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM ad_group_ad_asset_view
      WHERE ad_group_ad.ad.id = ${adId}
        AND ad_group_ad_asset_view.enabled = TRUE
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
      ORDER BY ad_group_ad_asset_view.field_type, metrics.impressions DESC
    `;

    const results = await customer.query(assetQuery);

    // Process results into headlines and descriptions with performance data
    const headlines: AssetPerformance[] = [];
    const descriptions: AssetPerformance[] = [];

    results.forEach((row: any) => {
      const fieldType = row.ad_group_ad_asset_view?.field_type;
      const text = row.asset?.text_asset?.text;
      
      if (!text) return;

      const assetData: AssetPerformance = {
        id: row.asset?.id?.toString() || '',
        text,
        fieldType: mapFieldType(fieldType),
        performanceLabel: mapPerformanceLabel(row.ad_group_ad_asset_view?.performance_label),
        pinnedField: mapPinnedField(row.ad_group_ad_asset_view?.pinned_field),
        enabled: row.ad_group_ad_asset_view?.enabled || false,
        impressions: row.metrics?.impressions || 0,
        clicks: row.metrics?.clicks || 0,
        conversions: row.metrics?.conversions || 0,
        cost: (row.metrics?.cost_micros || 0) / 1_000_000,
        ctr: row.metrics?.impressions > 0 
          ? (row.metrics.clicks / row.metrics.impressions) * 100 
          : 0,
      };

      // Categorize by field type
      if (fieldType === 2 || fieldType === 'HEADLINE') {
        headlines.push(assetData);
      } else if (fieldType === 3 || fieldType === 'DESCRIPTION') {
        descriptions.push(assetData);
      }
    });

    // Sort by impressions (best performing first)
    headlines.sort((a, b) => b.impressions - a.impressions);
    descriptions.sort((a, b) => b.impressions - a.impressions);

    // Calculate totals for context
    const headlineTotalImpressions = headlines.reduce((sum, h) => sum + h.impressions, 0);
    const descriptionTotalImpressions = descriptions.reduce((sum, d) => sum + d.impressions, 0);

    // Add relative performance percentage
    headlines.forEach(h => {
      h.impressionShare = headlineTotalImpressions > 0 
        ? (h.impressions / headlineTotalImpressions) * 100 
        : 0;
    });
    descriptions.forEach(d => {
      d.impressionShare = descriptionTotalImpressions > 0 
        ? (d.impressions / descriptionTotalImpressions) * 100 
        : 0;
    });

    const responseData = {
      adId,
      headlines,
      descriptions,
      summary: {
        totalHeadlines: headlines.length,
        totalDescriptions: descriptions.length,
        headlineTotalImpressions,
        descriptionTotalImpressions,
        bestHeadline: headlines.find(h => h.performanceLabel === 'BEST')?.text || null,
        bestDescription: descriptions.find(d => d.performanceLabel === 'BEST')?.text || null,
      },
      dateRange: {
        start: startDateStr,
        end: endDateStr,
        days: parseInt(dateRange)
      }
    };

    // Cache with smart TTL
    const ttl = serverCache.getSmartTTL(endDateStr, ServerCache.TTL.ADS);
    serverCache.set(cacheKey, responseData, ttl);

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false,
      timing: { total: Date.now() - startTime }
    });

  } catch (error: any) {
    console.error('Error fetching asset performance:', error);
    
    // Return empty data structure if the query fails
    return NextResponse.json({
      success: true,
      data: {
        adId,
        headlines: [],
        descriptions: [],
        summary: {
          totalHeadlines: 0,
          totalDescriptions: 0,
          headlineTotalImpressions: 0,
          descriptionTotalImpressions: 0,
          bestHeadline: null,
          bestDescription: null,
        },
        dateRange: {
          start: '',
          end: '',
          days: parseInt(dateRange)
        },
        error: 'Asset performance data not available for this ad'
      },
      timing: { total: Date.now() - startTime }
    });
  }
}

// Type definition for asset performance
interface AssetPerformance {
  id: string;
  text: string;
  fieldType: string;
  performanceLabel: string;
  pinnedField: string | null;
  enabled: boolean;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  impressionShare?: number;
}

// Map field type enum to string
function mapFieldType(fieldType: any): string {
  const fieldTypeMap: { [key: number]: string } = {
    0: 'UNSPECIFIED',
    1: 'UNKNOWN',
    2: 'HEADLINE',
    3: 'DESCRIPTION',
    4: 'MANDATORY_AD_TEXT',
    5: 'MARKETING_IMAGE',
    6: 'MEDIA_BUNDLE',
    7: 'YOUTUBE_VIDEO',
    8: 'BOOK_ON_GOOGLE',
    9: 'LEAD_FORM',
    10: 'PROMOTION',
    11: 'CALLOUT',
    12: 'STRUCTURED_SNIPPET',
    13: 'SITELINK',
    14: 'MOBILE_APP',
    15: 'HOTEL_CALLOUT',
    16: 'CALL',
    17: 'PRICE',
    18: 'LONG_HEADLINE',
    19: 'BUSINESS_NAME',
    20: 'SQUARE_MARKETING_IMAGE',
    21: 'PORTRAIT_MARKETING_IMAGE',
    22: 'LOGO',
    23: 'LANDSCAPE_LOGO',
    24: 'VIDEO',
    25: 'CALL_TO_ACTION',
  };

  if (typeof fieldType === 'string') return fieldType;
  return fieldTypeMap[fieldType] || 'UNKNOWN';
}

// Map performance label enum to string
function mapPerformanceLabel(label: any): string {
  const labelMap: { [key: number]: string } = {
    0: 'UNSPECIFIED',
    1: 'UNKNOWN',
    2: 'PENDING',
    3: 'LEARNING',
    4: 'LOW',
    5: 'GOOD',
    6: 'BEST',
  };

  if (typeof label === 'string') return label;
  return labelMap[label] || 'LEARNING';
}

// Map pinned field enum to readable string
function mapPinnedField(pinnedField: any): string | null {
  if (!pinnedField || pinnedField === 0 || pinnedField === 'UNSPECIFIED') return null;
  
  const pinnedMap: { [key: number]: string } = {
    1: 'HEADLINE_1',
    2: 'HEADLINE_2', 
    3: 'HEADLINE_3',
    4: 'DESCRIPTION_1',
    5: 'DESCRIPTION_2',
  };

  if (typeof pinnedField === 'string') return pinnedField;
  return pinnedMap[pinnedField] || null;
}

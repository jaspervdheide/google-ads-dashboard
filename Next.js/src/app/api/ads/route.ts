import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { serverCache, ServerCache } from '@/utils/serverCache';

// Device mapping for filtering
const deviceMap: { [key: string]: string } = {
  'desktop': 'DESKTOP',
  'mobile': 'MOBILE',
  'tablet': 'TABLET'
};

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get('customerId');
  const dateRange = searchParams.get('dateRange') || '30';
  const adGroupId = searchParams.get('adGroupId');
  const device = searchParams.get('device');

  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  if (!adGroupId) {
    return NextResponse.json({ error: 'Ad Group ID is required' }, { status: 400 });
  }

  try {
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Generate cache key
    const cacheKey = serverCache.generateKey('ads', {
      customerId,
      adGroupId,
      startDate: startDateStr,
      endDate: endDateStr,
      device
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

    // Build device filter clause
    let deviceSelect = '';
    let deviceWhere = '';
    if (device && deviceMap[device]) {
      deviceSelect = ', segments.device';
      deviceWhere = `AND segments.device = '${deviceMap[device]}'`;
    }

    // Query for Responsive Search Ads with performance metrics
    const adsQuery = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions,
        ad_group_ad.ad.responsive_search_ad.path1,
        ad_group_ad.ad.responsive_search_ad.path2,
        ad_group_ad.status,
        ad_group_ad.ad_strength,
        ad_group.id,
        ad_group.name,
        campaign.id,
        campaign.name,
        campaign.experiment_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc${deviceSelect}
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status = 'ENABLED'
        AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
        AND campaign.experiment_type = 'BASE'
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        ${deviceWhere}
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `;

    const results = await customer.query(adsQuery);

    // Process and aggregate results by ad ID
    const adMap = new Map();

    results.forEach((row: any) => {
      const adId = row.ad_group_ad?.ad?.id?.toString();
      if (!adId) return;

      if (adMap.has(adId)) {
        // Aggregate metrics
        const existing = adMap.get(adId);
        existing.impressions += row.metrics?.impressions || 0;
        existing.clicks += row.metrics?.clicks || 0;
        existing.costMicros += row.metrics?.cost_micros || 0;
        existing.conversions += row.metrics?.conversions || 0;
        existing.conversionsValue += row.metrics?.conversions_value || 0;
      } else {
        // Extract headlines and descriptions from RSA
        const headlines: string[] = [];
        const descriptions: string[] = [];

        if (row.ad_group_ad?.ad?.responsive_search_ad?.headlines) {
          row.ad_group_ad.ad.responsive_search_ad.headlines.forEach((h: any) => {
            if (h.text) headlines.push(h.text);
          });
        }

        if (row.ad_group_ad?.ad?.responsive_search_ad?.descriptions) {
          row.ad_group_ad.ad.responsive_search_ad.descriptions.forEach((d: any) => {
            if (d.text) descriptions.push(d.text);
          });
        }

        // Get final URL
        const finalUrls = row.ad_group_ad?.ad?.final_urls || [];
        const displayUrl = finalUrls.length > 0 ? finalUrls[0] : '';

        // Get paths
        const path1 = row.ad_group_ad?.ad?.responsive_search_ad?.path1 || '';
        const path2 = row.ad_group_ad?.ad?.responsive_search_ad?.path2 || '';

        adMap.set(adId, {
          id: adId,
          name: row.ad_group_ad?.ad?.name || `Ad ${adId}`,
          type: row.ad_group_ad?.ad?.type || 'RESPONSIVE_SEARCH_AD',
          status: row.ad_group_ad?.status === 2 || row.ad_group_ad?.status === 'ENABLED' ? 'ENABLED' : 'PAUSED',
          adStrength: mapAdStrength(row.ad_group_ad?.ad_strength),
          headlines,
          descriptions,
          finalUrl: displayUrl,
          displayPath: path1 || path2 ? `${path1}${path2 ? '/' + path2 : ''}` : '',
          adGroupId: row.ad_group?.id?.toString(),
          adGroupName: row.ad_group?.name,
          campaignId: row.campaign?.id?.toString(),
          campaignName: row.campaign?.name,
          impressions: row.metrics?.impressions || 0,
          clicks: row.metrics?.clicks || 0,
          costMicros: row.metrics?.cost_micros || 0,
          conversions: row.metrics?.conversions || 0,
          conversionsValue: row.metrics?.conversions_value || 0,
        });
      }
    });

    // Convert to array and calculate derived metrics
    const ads = Array.from(adMap.values()).map(ad => {
      const cost = ad.costMicros / 1_000_000;
      const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
      const avgCpc = ad.clicks > 0 ? cost / ad.clicks : 0;
      const cpa = ad.conversions > 0 ? cost / ad.conversions : 0;
      const roas = cost > 0 ? ad.conversionsValue / cost : 0;

      return {
        ...ad,
        cost,
        ctr,
        avgCpc,
        cpa,
        roas,
        conversionsValue: ad.conversionsValue,
      };
    });

    // Calculate totals
    const totals = ads.reduce((acc, ad) => ({
      impressions: acc.impressions + ad.impressions,
      clicks: acc.clicks + ad.clicks,
      cost: acc.cost + ad.cost,
      conversions: acc.conversions + ad.conversions,
      conversionsValue: acc.conversionsValue + ad.conversionsValue,
    }), {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionsValue: 0,
    });

    const responseData = {
      ads,
      totals: {
        ...totals,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
        cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
        roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
      },
      adGroupId,
      customerId,
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
    console.error('Error fetching ads:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch ads',
      timing: { total: Date.now() - startTime }
    }, { status: 500 });
  }
}

// Helper to map ad strength enum to readable string
function mapAdStrength(strength: any): string {
  const strengthMap: { [key: number]: string } = {
    0: 'UNSPECIFIED',
    1: 'UNKNOWN',
    2: 'PENDING',
    3: 'NO_ADS',
    4: 'POOR',
    5: 'AVERAGE',
    6: 'GOOD',
    7: 'EXCELLENT',
  };

  if (typeof strength === 'string') {
    return strength;
  }
  
  return strengthMap[strength] || 'UNKNOWN';
}

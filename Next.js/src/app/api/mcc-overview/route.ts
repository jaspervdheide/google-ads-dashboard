import { NextResponse } from 'next/server';
import { createCustomer, createGoogleAdsClient } from '@/utils/googleAdsClient';
import { handleApiError } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { 
  getCountryCodeFromCustomerId,
  calculateDerivedMetrics,
  convertCostFromMicros
} from '@/utils/apiHelpers';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { serverCache, ServerCache } from '@/utils/serverCache';

// Types for the response
interface AccountMetricsWithTrend {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  countryCode: string;
  campaignCount: number;
  topCampaign: string | null;
  metrics: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
    ctr: number;
    avgCpc: number;
    conversionRate: number;
    cpa: number;
    roas: number;
  };
  // Trend data compared to previous period (percentage changes)
  trends?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
    ctr: number;
    avgCpc: number;
    roas: number;
  };
  // Previous period raw metrics (for expandable row view)
  previousMetrics?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
    ctr: number;
    avgCpc: number;
    conversionRate: number;
    cpa: number;
    roas: number;
  };
}

// Helper to calculate percentage change
function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Helper to fetch metrics for a single account
async function fetchAccountMetrics(
  client: any,
  customerId: string,
  accountName: string,
  currency: string,
  timeZone: string,
  startDateStr: string,
  endDateStr: string
): Promise<{ metrics: any; campaigns: any[] } | null> {
  try {
        const accountCustomer = createCustomer(client, customerId);

        const campaignQuery = `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value
          FROM campaign
          WHERE campaign.status = 'ENABLED'
        AND campaign.experiment_type = 'BASE'
            AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          ORDER BY metrics.impressions DESC
        `;

        const campaignResults = await accountCustomer.query(campaignQuery);

    // Aggregate campaign data
        const campaignMap = new Map();
        
        campaignResults.forEach((row: any) => {
          const campaignId = row.campaign.id.toString();
          
          if (campaignMap.has(campaignId)) {
            const existing = campaignMap.get(campaignId);
            existing.impressions += row.metrics.impressions || 0;
            existing.clicks += row.metrics.clicks || 0;
            existing.costMicros += row.metrics.cost_micros || 0;
            existing.conversions += row.metrics.conversions || 0;
            existing.conversionsValueMicros += row.metrics.conversions_value || 0;
          } else {
            campaignMap.set(campaignId, {
              id: campaignId,
              name: row.campaign.name,
              impressions: row.metrics.impressions || 0,
              clicks: row.metrics.clicks || 0,
              costMicros: row.metrics.cost_micros || 0,
              conversions: row.metrics.conversions || 0,
              conversionsValueMicros: row.metrics.conversions_value || 0,
            });
          }
        });

        const campaigns = Array.from(campaignMap.values());

        // Calculate account-level totals
        const accountTotals = {
          impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
          clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
          cost: campaigns.reduce((sum, c) => sum + convertCostFromMicros(c.costMicros), 0),
          conversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
          conversionsValue: campaigns.reduce((sum, c) => sum + c.conversionsValueMicros, 0)
        };

    return {
      metrics: calculateDerivedMetrics(accountTotals),
      campaigns
    };
  } catch (error) {
    console.error(`Error fetching metrics for account ${customerId}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30';
    const days = parseInt(dateRange);
    
    // Calculate date ranges
    const { startDateStr, endDateStr } = getFormattedDateRange(days);
    
    // Calculate previous period (same duration, immediately before current period)
    const prevEndDate = new Date();
    prevEndDate.setDate(prevEndDate.getDate() - days);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    
    const prevStartDateStr = prevStartDate.toISOString().split('T')[0].replace(/-/g, '');
    const prevEndDateStr = prevEndDate.toISOString().split('T')[0].replace(/-/g, '');

    // Generate cache key
    const cacheKey = serverCache.generateKey('mcc-overview', {
      startDate: startDateStr,
      endDate: endDateStr
    });

    // Check cache first
    const cachedData = serverCache.get<any>(cacheKey);
    if (cachedData) {
      const response = NextResponse.json({
        success: true,
        message: `Retrieved overview for ${cachedData.accounts.length} accounts (cached)`,
        data: cachedData,
        cached: true
      });
      response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
      return response;
    }
    
    logger.apiStart('MCC Overview', { operation: 'fetch_all_accounts_overview', dateRange });
    
    // Initialize Google Ads client
    const client = createGoogleAdsClient();
    const mccCustomer = createCustomer(client, process.env.MCC_CUSTOMER_ID!);

    // Step 1: Fetch all accounts
    const accountsQuery = `
      SELECT 
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.currency_code,
        customer_client.time_zone
      FROM customer_client
      WHERE customer_client.level = 1
    `;

    const accountResults = await mccCustomer.query(accountsQuery);

    // Step 2: Prepare account info for parallel fetching
    const accountsInfo = accountResults.map((row: any) => {
      const fullCustomerId = row.customer_client?.client_customer;
      const customerId = fullCustomerId?.replace('customers/', '') || '';
      return {
        customerId,
        name: row.customer_client?.descriptive_name || 'Unknown',
        currency: row.customer_client?.currency_code || 'EUR',
        timeZone: row.customer_client?.time_zone || 'Europe/Amsterdam',
        countryCode: getCountryCodeFromCustomerId(customerId)
      };
    }).filter((acc: any) => acc.customerId);

    // Step 3: Fetch current AND previous period metrics in PARALLEL for all accounts
    const fetchPromises = accountsInfo.map(async (account: any) => {
      // Fetch both periods in parallel for each account
      const [currentData, previousData] = await Promise.all([
        fetchAccountMetrics(
          client, 
          account.customerId, 
          account.name, 
          account.currency, 
          account.timeZone,
          startDateStr, 
          endDateStr
        ),
        fetchAccountMetrics(
          client, 
          account.customerId, 
          account.name, 
          account.currency, 
          account.timeZone,
          prevStartDateStr, 
          prevEndDateStr
        )
      ]);

      return {
        account,
        currentData,
        previousData
      };
    });

    // Execute all account fetches in parallel
    const results = await Promise.all(fetchPromises);

    // Step 4: Process results
    const accountsWithMetrics: AccountMetricsWithTrend[] = [];
    let totalCampaignCount = 0;

    for (const { account, currentData, previousData } of results) {
      if (currentData) {
        const topCampaign = currentData.campaigns.length > 0 
          ? currentData.campaigns.reduce((top: any, campaign: any) => 
              campaign.impressions > top.impressions ? campaign : top
            ).name
          : null;

        // Calculate trends if we have previous data
        let trends = undefined;
        if (previousData) {
          trends = {
            impressions: calculatePercentChange(currentData.metrics.impressions, previousData.metrics.impressions),
            clicks: calculatePercentChange(currentData.metrics.clicks, previousData.metrics.clicks),
            cost: calculatePercentChange(currentData.metrics.cost, previousData.metrics.cost),
            conversions: calculatePercentChange(currentData.metrics.conversions, previousData.metrics.conversions),
            conversionsValue: calculatePercentChange(currentData.metrics.conversionsValue, previousData.metrics.conversionsValue),
            ctr: calculatePercentChange(currentData.metrics.ctr, previousData.metrics.ctr),
            avgCpc: calculatePercentChange(currentData.metrics.avgCpc, previousData.metrics.avgCpc),
            cpa: calculatePercentChange(currentData.metrics.cpa, previousData.metrics.cpa),
            roas: calculatePercentChange(currentData.metrics.roas, previousData.metrics.roas),
          };
        }

        accountsWithMetrics.push({
          id: account.customerId,
          name: account.name,
          currency: account.currency,
          timeZone: account.timeZone,
          countryCode: account.countryCode,
          campaignCount: currentData.campaigns.length,
          topCampaign,
          metrics: currentData.metrics,
          trends,
          previousMetrics: previousData?.metrics || undefined
        });

        totalCampaignCount += currentData.campaigns.length;
      } else {
        // Account with zero metrics
        const zeroMetrics = calculateDerivedMetrics({
          impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0
        });

        accountsWithMetrics.push({
          id: account.customerId,
          name: account.name,
          currency: account.currency,
          timeZone: account.timeZone,
          countryCode: account.countryCode,
          campaignCount: 0,
          topCampaign: null,
          metrics: zeroMetrics,
          trends: undefined,
          previousMetrics: undefined
        });
      }
    }

    // Calculate overall totals
    const overallTotals = {
      impressions: accountsWithMetrics.reduce((sum, acc) => sum + acc.metrics.impressions, 0),
      clicks: accountsWithMetrics.reduce((sum, acc) => sum + acc.metrics.clicks, 0),
      cost: accountsWithMetrics.reduce((sum, acc) => sum + acc.metrics.cost, 0),
      conversions: accountsWithMetrics.reduce((sum, acc) => sum + acc.metrics.conversions, 0),
      conversionsValue: accountsWithMetrics.reduce((sum, acc) => sum + acc.metrics.conversionsValue, 0)
    };

    const totalDerivedMetrics = calculateDerivedMetrics(overallTotals);

    const responseData = {
      accounts: accountsWithMetrics,
      totals: {
        accountCount: accountsWithMetrics.length,
        campaignCount: totalCampaignCount,
        ...totalDerivedMetrics
      },
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
        days
      },
      previousPeriod: {
        startDate: prevStartDateStr,
        endDate: prevEndDateStr
      }
    };

    // Cache the response
    const ttl = serverCache.getSmartTTL(endDateStr, ServerCache.TTL.ENTITY_LIST);
    serverCache.set(cacheKey, responseData, ttl);

    logger.apiComplete('MCC Overview', accountsWithMetrics.length);

    const response = NextResponse.json({
      success: true,
      message: `Retrieved overview for ${accountsWithMetrics.length} accounts with ${totalCampaignCount} total campaigns`,
      data: responseData,
      cached: false
    });
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    return handleApiError(error, 'MCC Overview');
  }
} 

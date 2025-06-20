import { NextResponse } from 'next/server';
import { createCustomer, createGoogleAdsClient } from '@/utils/googleAdsClient';
import { handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
import { 
  getCountryCodeFromCustomerId,
  calculateDerivedMetrics,
  convertCostFromMicros
} from '@/utils/apiHelpers';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { AccountMetrics, MccOverviewResponse } from '@/types/mcc';

export async function GET(request: Request): Promise<NextResponse<MccOverviewResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30'; // Default to 30 days
    
    logger.apiStart('MCC Overview', { operation: 'fetch_all_accounts_overview', dateRange });
    
    // Initialize Google Ads client
    const client = createGoogleAdsClient();
    const mccCustomer = createCustomer(client, process.env.MCC_CUSTOMER_ID!);

    // Get dynamic date range
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

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

    logger.queryStart('MCC Accounts', process.env.MCC_CUSTOMER_ID);
    const accountResults = await mccCustomer.query(accountsQuery);
    logger.queryComplete('MCC Accounts', accountResults.length, process.env.MCC_CUSTOMER_ID);

    // Step 2: For each account, fetch campaign metrics
    const accountsWithMetrics: AccountMetrics[] = [];
    let totalCampaignCount = 0;

    for (const accountRow of accountResults) {
      const fullCustomerId = accountRow.customer_client?.client_customer;
      if (!fullCustomerId) continue;
      
      const customerId = fullCustomerId.replace('customers/', '');
      const countryCode = getCountryCodeFromCustomerId(customerId);

      try {
        // Create customer connection for this specific account
        const accountCustomer = createCustomer(client, customerId);

        // Query campaigns for this account
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
            AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          ORDER BY metrics.impressions DESC
        `;

        logger.queryStart('Account Campaigns', customerId);
        const campaignResults = await accountCustomer.query(campaignQuery);
        logger.queryComplete('Account Campaigns', campaignResults.length, customerId);

        // Aggregate campaign data by campaign ID (same logic as campaigns API)
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
        totalCampaignCount += campaigns.length;

        // Calculate account-level totals
        const accountTotals = {
          impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
          clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
          cost: campaigns.reduce((sum, c) => sum + convertCostFromMicros(c.costMicros), 0),
          conversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
          conversionsValue: campaigns.reduce((sum, c) => sum + c.conversionsValueMicros, 0)
        };

        // Calculate derived metrics
        const derivedMetrics = calculateDerivedMetrics(accountTotals);

        // Find top campaign by impressions
        const topCampaign = campaigns.length > 0 
          ? campaigns.reduce((top, campaign) => 
              campaign.impressions > top.impressions ? campaign : top
            ).name
          : null;

        // Create account metrics object
        const accountMetrics: AccountMetrics = {
          id: customerId,
          name: accountRow.customer_client?.descriptive_name || 'Unknown',
          currency: accountRow.customer_client?.currency_code || 'EUR',
          timeZone: accountRow.customer_client?.time_zone || 'Europe/Amsterdam',
          countryCode,
          campaignCount: campaigns.length,
          topCampaign,
          metrics: derivedMetrics
        };

        accountsWithMetrics.push(accountMetrics);

      } catch (accountError) {
        console.error(`Failed to fetch metrics for account ${customerId}:`, accountError);
        // Continue with other accounts even if one fails
        
        // Add account with zero metrics
        const zeroMetrics = calculateDerivedMetrics({
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionsValue: 0
        });

        accountsWithMetrics.push({
          id: customerId,
          name: accountRow.customer_client?.descriptive_name || 'Unknown',
          currency: accountRow.customer_client?.currency_code || 'EUR',
          timeZone: accountRow.customer_client?.time_zone || 'Europe/Amsterdam',
          countryCode,
          campaignCount: 0,
          topCampaign: null,
          metrics: zeroMetrics
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
        days: parseInt(dateRange)
      }
    };

    logger.apiComplete('MCC Overview', accountsWithMetrics.length);

    return NextResponse.json({
      success: true,
      message: `✅ Retrieved overview for ${accountsWithMetrics.length} accounts with ${totalCampaignCount} total campaigns`,
      data: responseData
    });

  } catch (error) {
    return handleApiError(error, 'MCC Overview') as NextResponse<MccOverviewResponse>;
  }
} 
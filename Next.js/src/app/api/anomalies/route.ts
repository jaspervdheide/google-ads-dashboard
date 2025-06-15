import { NextRequest, NextResponse } from "next/server";
import { createGoogleAdsConnection, createCustomer, createGoogleAdsClient } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { handleValidationError, handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

// Country mapping from the accounts API
const COUNTRY_ACCOUNTS = {
  "NL": "5756290882",
  "BE": "5735473691", 
  "DE": "1946606314",
  "DK": "8921136631",
  "ES": "4748902087",
  "FI": "8470338623",
  "FR (Ravann)": "2846016798",
  "FR (Tapis)": "7539242704",
  "IT": "8472162607",
  "NO": "3581636329",
  "PL": "8467590750",
  "SE": "8463558543",
};

interface Account {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  countryCode: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  conversionRate: number;
  cpa: number;
  roas: number;
}

interface CampaignData {
  campaigns: Campaign[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    conversionRate: number;
    cpa: number;
    roas: number;
  };
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}

interface Anomaly {
  id: string;
  accountId: string;
  accountName: string;
  countryCode: string;
  severity: 'high' | 'medium' | 'low';
  type: 'business' | 'statistical';
  category: string;
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  expectedValue?: number;
  deviation?: number;
  detectedAt: string;
}

interface AnomalyData {
  anomalies: Anomaly[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Helper function to fetch accounts directly (no HTTP call)
async function fetchAccountsDirect(): Promise<Account[]> {
  try {
    logger.apiStart('Accounts', { operation: 'fetch_mcc_accounts' });
    
    const client = createGoogleAdsClient();
    const mccCustomer = createCustomer(client, process.env.MCC_CUSTOMER_ID!);

    const query = `
      SELECT 
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.currency_code,
        customer_client.time_zone
      FROM customer_client
      WHERE customer_client.level = 1
    `;

    logger.queryStart('MCC Accounts', process.env.MCC_CUSTOMER_ID);
    const results = await mccCustomer.query(query);
    logger.queryComplete('MCC Accounts', results.length, process.env.MCC_CUSTOMER_ID);
    
    const accounts = results.map((row: any) => {
      const fullCustomerId = row.customer_client.client_customer;
      const customerId = fullCustomerId.replace('customers/', '');
      
      const countryCode = Object.keys(COUNTRY_ACCOUNTS).find(
        key => COUNTRY_ACCOUNTS[key as keyof typeof COUNTRY_ACCOUNTS] === customerId
      ) || 'Unknown';
      
      return {
        id: customerId,
        name: row.customer_client.descriptive_name,
        currency: row.customer_client.currency_code,
        timeZone: row.customer_client.time_zone,
        countryCode
      };
    });

    logger.apiComplete('Accounts', accounts.length);
    return accounts;
  } catch (error) {
    console.error('Error fetching accounts directly:', error);
    return [];
  }
}

// Helper function to fetch campaign data directly (no HTTP call)
async function fetchCampaignsDirect(customerId: string, dateRange: number): Promise<CampaignData | null> {
  try {
    const client = createGoogleAdsClient();
    const customer = createCustomer(client, customerId);
    
    const { startDateStr, endDateStr } = getFormattedDateRange(dateRange);
    
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
      ORDER BY metrics.impressions DESC
    `;

    const results = await customer.query(query);
    
    const campaigns = results.map((row: any) => ({
      id: row.campaign.id.toString(),
      name: row.campaign.name,
      status: row.campaign.status,
      impressions: parseInt(row.metrics.impressions) || 0,
      clicks: parseInt(row.metrics.clicks) || 0,
      cost: (parseInt(row.metrics.cost_micros) || 0) / 1000000,
      ctr: parseFloat(row.metrics.ctr) || 0,
      avgCpc: (parseInt(row.metrics.average_cpc) || 0) / 1000000,
      conversions: parseFloat(row.metrics.conversions) || 0,
      conversionsValue: parseFloat(row.metrics.conversions_value) || 0,
      conversionRate: 0, // Will be calculated
      cpa: 0, // Will be calculated
      roas: 0 // Will be calculated
    }));

    // Calculate totals and derived metrics
    const totals = campaigns.reduce((acc, campaign) => ({
      impressions: acc.impressions + campaign.impressions,
      clicks: acc.clicks + campaign.clicks,
      cost: acc.cost + campaign.cost,
      conversions: acc.conversions + campaign.conversions,
      conversionsValue: acc.conversionsValue + campaign.conversionsValue,
      ctr: 0, // Will be calculated
      avgCpc: 0, // Will be calculated
      conversionRate: 0, // Will be calculated
      cpa: 0, // Will be calculated
      roas: 0 // Will be calculated
    }), {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionsValue: 0,
      ctr: 0,
      avgCpc: 0,
      conversionRate: 0,
      cpa: 0,
      roas: 0
    });

    // Calculate derived metrics
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    totals.avgCpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
    totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
    totals.cpa = totals.conversions > 0 ? totals.cost / totals.conversions : 0;
    totals.roas = totals.cost > 0 ? totals.conversionsValue / totals.cost : 0;

    // Update campaign-level derived metrics
    campaigns.forEach(campaign => {
      campaign.conversionRate = campaign.clicks > 0 ? (campaign.conversions / campaign.clicks) * 100 : 0;
      campaign.cpa = campaign.conversions > 0 ? campaign.cost / campaign.conversions : 0;
      campaign.roas = campaign.cost > 0 ? campaign.conversionsValue / campaign.cost : 0;
    });

    return {
      campaigns,
      totals,
      dateRange: {
        days: dateRange,
        startDate: startDateStr,
        endDate: endDateStr
      },
      customerId
    };
  } catch (error) {
    console.error(`Error fetching campaigns for ${customerId}:`, error);
    return null;
  }
}

// Helper function to detect business rule anomalies
function detectBusinessRuleAnomalies(
  campaignData: CampaignData,
  accountId: string,
  accountName: string,
  countryCode: string
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const { campaigns, totals } = campaignData;
  
  // 1. Zero impressions with active campaigns
  const activeCampaigns = campaigns.filter(c => c.status === 'ENABLED');
  const zeroImpressionCampaigns = activeCampaigns.filter(c => c.impressions === 0);
  
  if (zeroImpressionCampaigns.length > 0) {
    anomalies.push({
      id: `business_${accountId}_zero_impressions_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'high',
      type: 'business',
      category: 'Campaign Performance',
      title: 'Active campaigns with zero impressions',
      description: `${zeroImpressionCampaigns.length} active campaign(s) received no impressions in the last 30 days`,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 2. Very low CTR (< 0.5%)
  if (totals.ctr < 0.5 && totals.impressions > 1000) {
    anomalies.push({
      id: `business_${accountId}_low_ctr_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'medium',
      type: 'business',
      category: 'Click-Through Rate',
      title: 'Unusually low account CTR detected',
      description: `Account CTR is ${totals.ctr.toFixed(2)}%, which is below the 0.5% threshold for the 30-day period`,
      currentValue: totals.ctr,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 3. Very high CPC (> €5.00)
  if (totals.avgCpc > 5.0) {
    anomalies.push({
      id: `business_${accountId}_high_cpc_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'medium',
      type: 'business',
      category: 'Cost Per Click',
      title: 'High average CPC detected',
      description: `Account average CPC is €${totals.avgCpc.toFixed(2)}, which exceeds the €5.00 threshold for the 30-day period`,
      currentValue: totals.avgCpc,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 4. Low conversion rate (< 1%)
  if (totals.conversionRate < 1.0 && totals.clicks > 1000) {
    anomalies.push({
      id: `business_${accountId}_low_conversion_rate_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'medium',
      type: 'business',
      category: 'Conversion Performance',
      title: 'Low account conversion rate detected',
      description: `Account conversion rate is ${totals.conversionRate.toFixed(2)}%, which is below the 1% threshold for the 30-day period`,
      currentValue: totals.conversionRate,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 5. High CPA (> €100)
  if (totals.cpa > 100 && totals.conversions > 0) {
    anomalies.push({
      id: `business_${accountId}_high_cpa_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'high',
      type: 'business',
      category: 'Cost Per Acquisition',
      title: 'High cost per acquisition detected',
      description: `Account CPA is €${totals.cpa.toFixed(2)}, which exceeds the €100 threshold for the 30-day period`,
      currentValue: totals.cpa,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 6. Low ROAS (< 2.0)
  if (totals.roas < 2.0 && totals.conversionsValue > 0 && totals.cost > 500) {
    anomalies.push({
      id: `business_${accountId}_low_roas_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'high',
      type: 'business',
      category: 'Return on Ad Spend',
      title: 'Low account ROAS detected',
      description: `Account ROAS is ${totals.roas.toFixed(2)}, which is below the 2.0 threshold for the 30-day period`,
      currentValue: totals.roas,
      detectedAt: new Date().toISOString()
    });
  }
  
  return anomalies;
}

export async function GET(request: NextRequest) {
  console.log("🔍 Anomalies API: Starting anomaly detection...");
  try {
    logger.apiStart('Anomalies', { operation: 'detect_anomalies' });
    
    // Fetch all accounts directly (no HTTP call)
    const accounts = await fetchAccountsDirect();
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    console.log(`🔍 Anomalies API: Processing ${accounts.length} accounts...`);
    const allAnomalies: Anomaly[] = [];
    
    // Process each account
    for (const account of accounts) {
      try {
        // Fetch current period data directly (30 days)
        const currentData = await fetchCampaignsDirect(account.id, 30);
        if (!currentData) continue;
        
        // Skip accounts with no data
        if (!currentData.campaigns || currentData.campaigns.length === 0) continue;
        
        // Detect business rule anomalies on current period account totals
        const businessAnomalies = detectBusinessRuleAnomalies(
          currentData,
          account.id,
          account.name,
          account.countryCode
        );
        allAnomalies.push(...businessAnomalies);
        
      } catch (error) {
        console.warn(`Failed to process account ${account.id}:`, error);
      }
    }
    
    // Sort anomalies by severity and detection time
    const severityOrder = { high: 3, medium: 2, low: 1 };
    allAnomalies.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
    
    // Calculate summary
    const summary = {
      total: allAnomalies.length,
      high: allAnomalies.filter(a => a.severity === 'high').length,
      medium: allAnomalies.filter(a => a.severity === 'medium').length,
      low: allAnomalies.filter(a => a.severity === 'low').length
    };
    
    const response: AnomalyData = {
      anomalies: allAnomalies,
      summary
    };
    
    console.log(`🔍 Anomalies API: Completed. Found ${allAnomalies.length} anomalies (${summary.high} high, ${summary.medium} medium, ${summary.low} low)`);
    logger.apiComplete('Anomalies', allAnomalies.length);
    
    return createSuccessResponse(response, `✅ Detected ${allAnomalies.length} anomalies across ${accounts.length} accounts`);
    
  } catch (error) {
    console.error('❌ Anomaly Detection Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    return handleApiError(error, 'Anomaly Detection');
  }
}

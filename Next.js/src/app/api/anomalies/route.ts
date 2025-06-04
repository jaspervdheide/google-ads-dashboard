import { NextRequest, NextResponse } from "next/server";

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

// Helper function to calculate statistical anomalies
function detectStatisticalAnomalies(
  current: number,
  historical: number[],
  metric: string,
  accountId: string,
  accountName: string,
  countryCode: string
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (historical.length < 7) return anomalies; // Need at least 7 days of data
  
  const mean = historical.reduce((sum, val) => sum + val, 0) / historical.length;
  const variance = historical.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historical.length;
  const stdDev = Math.sqrt(variance);
  
  // Z-score calculation
  const zScore = stdDev > 0 ? Math.abs(current - mean) / stdDev : 0;
  
  // Detect anomalies based on z-score thresholds
  if (zScore > 3) { // 3 standard deviations
    const deviation = ((current - mean) / mean) * 100;
    const severity: 'high' | 'medium' | 'low' = zScore > 4 ? 'high' : zScore > 3.5 ? 'medium' : 'low';
    
    const direction = deviation > 0 ? 'higher' : 'lower';
    const timeDescription = 'compared to the previous 30-day period';
    
    anomalies.push({
      id: `stat_${accountId}_${metric}_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity,
      type: 'statistical',
      category: 'Performance Deviation',
      title: `Unusual ${metric} detected`,
      description: `${metric} is significantly ${direction} than expected (${Math.abs(deviation).toFixed(1)}% deviation) ${timeDescription}`,
      metric,
      currentValue: current,
      expectedValue: mean,
      deviation: Math.abs(deviation),
      detectedAt: new Date().toISOString()
    });
  }
  
  return anomalies;
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
  
  // 4. High spend with zero clicks
  if (totals.cost > 500 && totals.clicks === 0) {
    anomalies.push({
      id: `business_${accountId}_spend_no_clicks_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'high',
      type: 'business',
      category: 'Budget Efficiency',
      title: 'High spend with no clicks',
      description: `Account spent €${totals.cost.toFixed(2)} in the last 30 days but received no clicks`,
      currentValue: totals.cost,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 5. Campaign status anomalies
  const pausedCampaigns = campaigns.filter(c => c.status === 'PAUSED');
  if (pausedCampaigns.length > activeCampaigns.length && activeCampaigns.length > 0) {
    anomalies.push({
      id: `business_${accountId}_paused_campaigns_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'low',
      type: 'business',
      category: 'Campaign Management',
      title: 'More campaigns paused than active',
      description: `Account has ${pausedCampaigns.length} campaigns paused while only ${activeCampaigns.length} are active`,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 6. Low conversion rate (< 1%)
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
  
  // 7. High CPA (> €100)
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
  
  // 8. Low ROAS (< 2.0)
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
  
  // 9. Zero conversions with significant spend (> €1000 for 30-day period)
  if (totals.conversions === 0 && totals.cost > 1000) {
    anomalies.push({
      id: `business_${accountId}_no_conversions_high_spend_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'high',
      type: 'business',
      category: 'Conversion Performance',
      title: 'No conversions despite high spend',
      description: `Account spent €${totals.cost.toFixed(2)} in the last 30 days but received no conversions`,
      currentValue: totals.cost,
      detectedAt: new Date().toISOString()
    });
  }
  
  // 10. Conversions without conversion value (tracking issue)
  if (totals.conversions > 0 && totals.conversionsValue === 0) {
    anomalies.push({
      id: `business_${accountId}_conversions_no_value_${Date.now()}`,
      accountId,
      accountName,
      countryCode,
      severity: 'medium',
      type: 'business',
      category: 'Conversion Tracking',
      title: 'Conversions without conversion value',
      description: `Account has ${totals.conversions} conversion(s) but no conversion value tracked, which prevents ROAS calculation`,
      currentValue: totals.conversions,
      detectedAt: new Date().toISOString()
    });
  }
  
  return anomalies;
}

export async function GET(request: NextRequest) {
  try {
    // Calculate date ranges for comparison
    const today = new Date();
    
    // Current period: 30 days with 2-day offset (days -32 to -2)
    const currentPeriodEnd = new Date(today);
    currentPeriodEnd.setDate(today.getDate() - 2); // 2-day offset
    const currentPeriodStart = new Date(currentPeriodEnd);
    currentPeriodStart.setDate(currentPeriodEnd.getDate() - 29); // 30 days
    
    // Historical period: 30 days before current period (days -62 to -32)
    const historicalPeriodEnd = new Date(currentPeriodStart);
    historicalPeriodEnd.setDate(currentPeriodStart.getDate() - 1); // Day before current period starts
    const historicalPeriodStart = new Date(historicalPeriodEnd);
    historicalPeriodStart.setDate(historicalPeriodEnd.getDate() - 29); // 30 days
    
    console.log(`Anomaly Detection Time Periods:
    Current Period: ${currentPeriodStart.toISOString().split('T')[0]} to ${currentPeriodEnd.toISOString().split('T')[0]}
    Historical Period: ${historicalPeriodStart.toISOString().split('T')[0]} to ${historicalPeriodEnd.toISOString().split('T')[0]}`);
    
    // Fetch all accounts
    const accountsResponse = await fetch('http://localhost:3000/api/accounts');
    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch accounts');
    }
    const accountsResult = await accountsResponse.json();
    
    if (!accountsResult.success || !accountsResult.data) {
      throw new Error('Invalid accounts response format');
    }
    
    const accounts: Account[] = accountsResult.data;
    const allAnomalies: Anomaly[] = [];
    
    // Process each account
    for (const account of accounts) {
      try {
        // Fetch current period data (30 days with 2-day offset)
        const currentResponse = await fetch(`http://localhost:3000/api/campaigns?customerId=${account.id}&dateRange=30`);
        if (!currentResponse.ok) continue;
        
        const currentResult = await currentResponse.json();
        if (!currentResult.success || !currentResult.data) continue;
        
        const currentData: CampaignData = currentResult.data;
        
        // Skip accounts with no data
        if (!currentData.campaigns || currentData.campaigns.length === 0) continue;
        
        // Get account-level totals for current period
        const currentAccountMetrics = {
          clicks: currentData.totals.clicks,
          impressions: currentData.totals.impressions,
          cost: currentData.totals.cost,
          conversions: currentData.totals.conversions,
          conversionsValue: currentData.totals.conversionsValue,
          ctr: currentData.totals.ctr,
          cpa: currentData.totals.cpa,
          roas: currentData.totals.roas
        };
        
        // Detect business rule anomalies on current period account totals
        const businessAnomalies = detectBusinessRuleAnomalies(
          currentData,
          account.id,
          account.name,
          account.countryCode
        );
        allAnomalies.push(...businessAnomalies);
        
        // Fetch historical period data for comparison (60 days to get both periods)
        try {
          const historicalResponse = await fetch(`http://localhost:3000/api/campaigns?customerId=${account.id}&dateRange=60`);
          if (historicalResponse.ok) {
            const historicalResult = await historicalResponse.json();
            if (historicalResult.success && historicalResult.data) {
              const historicalData: CampaignData = historicalResult.data;
              
              // Calculate historical period metrics (60-day total minus current 30-day = previous 30-day period)
              const historicalAccountMetrics = {
                clicks: Math.max(0, historicalData.totals.clicks - currentAccountMetrics.clicks),
                impressions: Math.max(0, historicalData.totals.impressions - currentAccountMetrics.impressions),
                cost: Math.max(0, historicalData.totals.cost - currentAccountMetrics.cost),
                conversions: Math.max(0, historicalData.totals.conversions - currentAccountMetrics.conversions),
                conversionsValue: Math.max(0, historicalData.totals.conversionsValue - currentAccountMetrics.conversionsValue),
                ctr: historicalData.totals.ctr, // Use historical CTR as baseline
                cpa: historicalData.totals.cpa, // Use historical CPA as baseline
                roas: historicalData.totals.roas // Use historical ROAS as baseline
              };
              
              // Calculate percentage changes for each metric
              const detectAccountLevelAnomaly = (
                currentValue: number,
                historicalValue: number,
                metricName: string,
                metricDisplayName: string
              ) => {
                if (historicalValue === 0) return; // Skip if no historical data
                
                const percentageChange = ((currentValue - historicalValue) / historicalValue) * 100;
                const absoluteChange = Math.abs(percentageChange);
                
                // Define thresholds for account-level anomalies
                let severity: 'high' | 'medium' | 'low' | null = null;
                
                if (absoluteChange >= 50) {
                  severity = 'high';
                } else if (absoluteChange >= 30) {
                  severity = 'medium';
                } else if (absoluteChange >= 20) {
                  severity = 'low';
                }
                
                if (severity) {
                  const direction = percentageChange > 0 ? 'increased' : 'decreased';
                  const category = metricName.includes('cost') || metricName.includes('cpa') ? 'Cost Efficiency' :
                                 metricName.includes('conversion') || metricName.includes('roas') ? 'Conversion Performance' :
                                 'Traffic Performance';
                  
                  allAnomalies.push({
                    id: `account_${account.id}_${metricName}_${Date.now()}`,
                    accountId: account.id,
                    accountName: account.name,
                    countryCode: account.countryCode,
                    severity,
                    type: 'statistical',
                    category,
                    title: `Account ${metricDisplayName} ${direction} significantly`,
                    description: `${metricDisplayName} ${direction} by ${absoluteChange.toFixed(1)}% compared to the previous 30-day period (from ${historicalValue.toLocaleString()} to ${currentValue.toLocaleString()})`,
                    metric: metricDisplayName,
                    currentValue: currentValue,
                    expectedValue: historicalValue,
                    deviation: absoluteChange,
                    detectedAt: new Date().toISOString()
                  });
                }
              };
              
              // Check each account-level metric for anomalies
              detectAccountLevelAnomaly(currentAccountMetrics.clicks, historicalAccountMetrics.clicks, 'clicks', 'Clicks');
              detectAccountLevelAnomaly(currentAccountMetrics.impressions, historicalAccountMetrics.impressions, 'impressions', 'Impressions');
              detectAccountLevelAnomaly(currentAccountMetrics.cost, historicalAccountMetrics.cost, 'cost', 'Cost');
              detectAccountLevelAnomaly(currentAccountMetrics.conversions, historicalAccountMetrics.conversions, 'conversions', 'Conversions');
              detectAccountLevelAnomaly(currentAccountMetrics.conversionsValue, historicalAccountMetrics.conversionsValue, 'conversions_value', 'Conversion Value');
              
              // For rates, compare directly (not as totals)
              if (historicalAccountMetrics.ctr > 0) {
                detectAccountLevelAnomaly(currentAccountMetrics.ctr, historicalAccountMetrics.ctr, 'ctr', 'CTR');
              }
              if (historicalAccountMetrics.cpa > 0) {
                detectAccountLevelAnomaly(currentAccountMetrics.cpa, historicalAccountMetrics.cpa, 'cpa', 'CPA');
              }
              if (historicalAccountMetrics.roas > 0) {
                detectAccountLevelAnomaly(currentAccountMetrics.roas, historicalAccountMetrics.roas, 'roas', 'ROAS');
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch historical data for account ${account.id}:`, error);
        }
        
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
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to detect anomalies' },
      { status: 500 }
    );
  }
}

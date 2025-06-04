import { NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30'; // Default to 30 days
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: "❌ Customer ID is required"
      }, { status: 400 });
    }

    console.log(`Fetching campaign performance for customer ${customerId} with ${dateRange} days range...`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    if (parseInt(dateRange) === 1) {
      // For today only, use the same date for start and end
      startDate.setTime(endDate.getTime());
    } else {
      // For multiple days, subtract the range
      startDate.setDate(endDate.getDate() - parseInt(dateRange));
    }
    
    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Initialize Google Ads client
    const client = new GoogleAdsApi({
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!,
      developer_token: process.env.DEVELOPER_TOKEN!,
    });

    // Get customer instance
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.REFRESH_TOKEN!,
      login_customer_id: process.env.MCC_CUSTOMER_ID!,
    });

    // Query to get campaign performance data
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

    console.log('Executing campaign performance query:', query);
    const results = await customer.query(query);
    
    // Process results and aggregate by campaign
    const campaignMap = new Map();
    
    results.forEach((row: any) => {
      const campaignId = row.campaign.id.toString();
      
      if (campaignMap.has(campaignId)) {
        // Aggregate metrics
        const existing = campaignMap.get(campaignId);
        existing.impressions += row.metrics.impressions || 0;
        existing.clicks += row.metrics.clicks || 0;
        existing.costMicros += row.metrics.cost_micros || 0;
        existing.conversions += row.metrics.conversions || 0;
        existing.conversionsValueMicros += row.metrics.conversions_value || 0;
      } else {
        // New campaign entry
        campaignMap.set(campaignId, {
          id: campaignId,
          name: row.campaign.name,
          status: row.campaign.status,
          impressions: row.metrics.impressions || 0,
          clicks: row.metrics.clicks || 0,
          costMicros: row.metrics.cost_micros || 0,
          conversions: row.metrics.conversions || 0,
          conversionsValueMicros: row.metrics.conversions_value || 0,
        });
      }
    });
    
    // Convert map to array and calculate derived metrics
    const campaigns = Array.from(campaignMap.values()).map(campaign => ({
      ...campaign,
      cost: campaign.costMicros / 1_000_000, // Convert micros to currency
      conversionsValue: campaign.conversionsValueMicros, // conversions_value is already in currency format, not micros
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100) : 0,
      avgCpc: campaign.clicks > 0 ? (campaign.costMicros / campaign.clicks / 1_000_000) : 0,
      conversionRate: campaign.clicks > 0 ? (campaign.conversions / campaign.clicks * 100) : 0,
      cpa: campaign.conversions > 0 ? (campaign.costMicros / campaign.conversions / 1_000_000) : 0,
      roas: campaign.costMicros > 0 ? (campaign.conversionsValueMicros / campaign.costMicros * 1_000_000) : 0 // Multiply by 1M since cost is in micros but conversions_value is in currency
    }));
    
    // Calculate totals
    const totals = {
      impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
      clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      cost: campaigns.reduce((sum, c) => sum + c.cost, 0),
      conversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
      conversionsValue: campaigns.reduce((sum, c) => sum + c.conversionsValue, 0),
      ctr: 0,
      avgCpc: 0,
      conversionRate: 0,
      cpa: 0,
      roas: 0
    };
    
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
    totals.avgCpc = totals.clicks > 0 ? (totals.cost / totals.clicks) : 0;
    totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks * 100) : 0;
    totals.cpa = totals.conversions > 0 ? (totals.cost / totals.conversions) : 0;
    totals.roas = totals.cost > 0 ? (totals.conversionsValue / totals.cost) : 0;

    console.log(`Successfully retrieved ${campaigns.length} campaigns`);
    
    return NextResponse.json({
      success: true,
      message: `✅ Retrieved ${campaigns.length} campaigns for ${dateRange} days`,
      data: {
        campaigns,
        totals,
        dateRange: {
          days: parseInt(dateRange),
          startDate: startDateStr,
          endDate: endDateStr
        },
        customerId
      }
    });

  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    
    return NextResponse.json({
      success: false,
      message: "❌ Failed to fetch campaign performance",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
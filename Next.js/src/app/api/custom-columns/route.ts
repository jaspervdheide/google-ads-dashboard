import { NextRequest, NextResponse } from 'next/server';

/**
 * Information about custom columns in Google Ads
 * 
 * NOTE: Custom columns created in Google Ads UI are NOT directly queryable via the API.
 * They are UI-computed columns that combine standard metrics.
 * 
 * For profit calculations, we have two options:
 * 1. ProfitMetrics integration (DE, FR, NL accounts) - conversion_value = profit
 * 2. Calculate from Channable COGS data + Google Ads revenue
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');

  console.log(`Custom Columns API: Request for customer ${customerId}`);

  if (!customerId) {
    return NextResponse.json({
      success: false,
      message: 'Customer ID is required'
    }, { status: 400 });
  }

  // Custom columns created in Google Ads UI are NOT directly accessible via API
  // They are computed at the UI level using formulas
  // 
  // Available options for profit data:
  // 1. ProfitMetrics accounts (DE, FR, NL): conversion_value already contains profit
  // 2. Standard accounts: Use COGS from Channable feed + revenue from API
  
  const PROFIT_METRICS_ACCOUNTS = ['1946606314', '7539242704', '5756290882'];
  const usesProfitMetrics = PROFIT_METRICS_ACCOUNTS.includes(customerId);

  return NextResponse.json({
    success: true,
    message: 'Custom columns info',
    data: {
      customerId,
      usesProfitMetrics,
      accountType: usesProfitMetrics ? 'ProfitMetrics' : 'Standard',
      explanation: usesProfitMetrics 
        ? 'This account uses ProfitMetrics. The conversion_value field already contains PROFIT (revenue minus COGS).'
        : 'This account uses standard tracking. conversion_value = revenue. We calculate profit using COGS from Channable feeds.',
      availableMetrics: {
        fromGoogleAds: [
          'metrics.impressions',
          'metrics.clicks', 
          'metrics.cost_micros',
          'metrics.conversions',
          'metrics.conversions_value',
          'metrics.ctr',
          'metrics.average_cpc'
        ],
        fromChannableFeed: [
          'cogs (pm:price_buy)',
          'selling_price (g:price)',
          'make',
          'model', 
          'material'
        ],
        calculated: usesProfitMetrics ? [
          'POAS = conversions_value / cost',
          'Net Profit = conversions_value - cost'
        ] : [
          'COGS Total = cogs × conversions',
          'Gross Profit = conversions_value - COGS Total',
          'Net Profit = Gross Profit - cost',
          'Margin = Gross Profit / conversions_value',
          'ROAS = conversions_value / cost',
          'POAS = Gross Profit / cost'
        ]
      },
      note: 'Custom columns from Google Ads UI (like "Gross Profit Margin") are NOT directly queryable via API. They are computed in the UI using formulas on standard metrics.'
    }
  });
}


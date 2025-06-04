# Google Ads Dashboard - Next.js Implementation

This directory contains the Next.js-based implementation of the Google Ads dashboard with full campaign performance tracking.

## Files

- `src/app/page.tsx` - Main dashboard with account selector and campaign table
- `src/app/layout.tsx` - App layout
- `src/app/api/accounts/route.ts` - API endpoint to list all MCC accounts
- `src/app/api/campaigns/route.ts` - API endpoint for campaign performance data
- `src/app/api/google-ads/route.ts` - Basic Google Ads API connection test
- `src/app/globals.css` - Global styles (Tailwind CSS)
- `.env.local` - Environment variables (credentials)
- `package.json` - Node.js dependencies

## Running the Next.js App

```bash
cd Next.js
npm run dev
```

The app will be available at `http://localhost:3000`

## API Endpoints

- `GET /api/accounts` - List all accounts under the MCC with country mapping
- `GET /api/campaigns?customerId={id}&dateRange={days}` - Get campaign performance data
  - `customerId`: The Google Ads customer ID
  - `dateRange`: Number of days (7 or 30)
- `GET /api/google-ads` - Test Google Ads API connection

## Features

### 🎯 **Account Management**
- **Multi-Country Dropdown**: Select from all 16 accounts under the MCC
- **Country Mapping**: Automatic mapping of customer IDs to country codes
- **Account Details**: Display selected account name, currency, and country

### 📊 **Campaign Performance Dashboard**
- **Date Range Selection**: Switch between last 7 days and last 30 days
- **Real-time Data**: Live Google Ads API integration with automatic refresh
- **Performance Metrics**: 
  - Total Impressions
  - Total Clicks  
  - Total Cost (in EUR)
  - Overall CTR (Click-Through Rate)

### 📈 **Campaign Table**
- **Detailed Campaign View**: All enabled campaigns with performance data
- **Sortable Columns**: Campaign name, impressions, clicks, CTR, cost, avg CPC
- **Campaign Details**: Campaign ID and name for easy identification
- **Responsive Design**: Mobile-friendly table with horizontal scrolling

### 🔄 **Dynamic Data Loading**
- **Auto-refresh**: Data updates when changing accounts or date ranges
- **Loading States**: Visual feedback during API calls
- **Error Handling**: Clear error messages for API failures

## Supported Countries

The dashboard supports all 16 country accounts:
- **NL** - Netherlands (Just Carpets)
- **BE** - Belgium (Just Carpets)
- **DE** - Germany (Online Fussmatten)
- **DK** - Denmark (Bilmaatter Online)
- **ES** - Spain (Solo Alfombrillas)
- **FI** - Finland (Auton Matot)
- **FR (Ravann)** - France (Ravann)
- **FR (Tapis)** - France (Tapis Voiture)
- **IT** - Italy (Tappetini Online)
- **NO** - Norway (Bilmatter)
- **PL** - Poland (Moto Dywaniki)
- **SE** - Sweden (Bilmattor)
- **EU** - European Union (Just Carpets)
- **UK** - United Kingdom (Carmatscentre.co.uk)

## Status

✅ **Fully Functional** - Complete dashboard with:
- ✅ Account dropdown with all 16 MCC accounts
- ✅ Date range selector (7 days / 30 days)
- ✅ Campaign performance table with real data
- ✅ Summary metrics cards
- ✅ Responsive design with Tailwind CSS
- ✅ Error handling and loading states

## Sample Data

The dashboard displays real campaign performance data including:
- Campaign names and IDs
- Impressions and clicks
- Cost data in EUR
- CTR (Click-Through Rate)
- Average CPC (Cost Per Click)

All data is aggregated by campaign and filtered by the selected date range. 
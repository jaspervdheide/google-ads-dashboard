# Google Ads Dashboard - Next.js Implementation

A modern, real-time Google Ads campaign performance dashboard built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Google Ads API credentials

# Run development server
npm run dev
```

Visit `http://localhost:3000` to view the dashboard.

## 🔧 Environment Variables

Create a `.env.local` file with your Google Ads API credentials:

```env
# Google Ads API Configuration
DEVELOPER_TOKEN=your_developer_token_here
CLIENT_ID=your_client_id_here.apps.googleusercontent.com
CLIENT_SECRET=your_client_secret_here
REFRESH_TOKEN=your_refresh_token_here
MCC_CUSTOMER_ID=123-456-7890
```

## 🎯 Features

### **Account Management**
- Multi-country dropdown with 16 supported accounts
- Automatic country code mapping
- Account details display (name, currency, country)

### **Campaign Performance Dashboard**
- Real-time Google Ads API integration
- Date range selection (7 days / 30 days)
- Performance metrics: Impressions, Clicks, Cost, CTR
- Auto-refresh on account/date range changes

### **Campaign Table**
- All enabled campaigns with detailed performance data
- Sortable columns (campaign name, impressions, clicks, CTR, cost, avg CPC)
- Responsive design with mobile-friendly scrolling
- Campaign ID and name for easy identification

## 🌍 Supported Countries

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

## 🔌 API Endpoints

- `GET /api/accounts` - List all MCC accounts with country mapping
- `GET /api/campaigns?customerId={id}&dateRange={days}` - Campaign performance data
- `GET /api/google-ads` - Test Google Ads API connection
- `GET /api/ad-groups` - Ad group metrics
- `GET /api/historical-data` - Historical performance data
- `GET /api/anomalies` - Performance anomaly detection

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   ├── page.tsx          # Main dashboard
│   ├── layout.tsx        # App layout
│   └── globals.css       # Global styles
└── lib/                  # Utilities and configurations
```

## 🚀 Deployment

Ready for deployment on Vercel:

```bash
npm run build
vercel --prod
```

Add environment variables in the Vercel dashboard.

---

**Status**: ✅ **Production Ready** - Fully functional dashboard with real-time Google Ads API integration 
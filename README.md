# Google Ads Dashboard

A modern, comprehensive PPC management tool for managing Google Ads campaigns across multiple countries.

## 🚀 Features

* **Multi-Country Support**: Manage campaigns for 14 different countries
* **Real-time Data**: Live Google Ads API integration
* **Modern UI**: Built with Next.js, TypeScript, and Tailwind CSS
* **Security**: Environment variable-based configuration
* **Campaign Metrics**: View impressions, clicks, and costs
* **Interactive Interface**: Easy country selection and data visualization

## 🛠️ Technology Stack

* **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
* **API**: Google Ads API integration
* **Authentication**: OAuth 2.0 with Google Ads API
* **Deployment**: Vercel-ready

## 🏃 Quick Start

```bash
# Clone the repository
git clone https://github.com/jaspervdheide/google-ads-dashboard.git
cd google-ads-dashboard

# Navigate to the project directory
cd Next.js

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.local.example .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🔧 Environment Variables

Create a `.env.local` file in the `Next.js` directory with the following variables:

```env
DEVELOPER_TOKEN=your_developer_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
REFRESH_TOKEN=your_refresh_token
MCC_CUSTOMER_ID=your_mcc_customer_id
```

## 🌍 Supported Countries

The dashboard supports the following country accounts:

* Netherlands (NL)
* Belgium (BE)
* Germany (DE)
* Denmark (DK)
* Spain (ES)
* Finland (FI)
* France - Ravann (FR)
* France - Tapis (FR)
* Italy (IT)
* Norway (NO)
* Poland (PL)
* Sweden (SE)
* European Union (EU)
* United Kingdom (UK)

## 📁 Project Structure

```
Next.js/
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   │   └── ...
│   │   ├── components/   # React components
│   │   └── page.tsx      # Main dashboard page
│   └── lib/              # Utilities and configurations
├── public/               # Static assets
└── ...config files
```

## 🔌 API Endpoints

* `/api/accounts` - Get MCC account information
* `/api/campaigns` - Get campaign data for selected country
* `/api/ad-groups` - Get ad group metrics
* `/api/historical-data` - Get historical performance data
* `/api/anomalies` - Detect performance anomalies

## 🚀 Deployment

This project is configured for easy deployment on Vercel:

```bash
# Deploy to Vercel
npm run build
vercel --prod
```

Make sure to add your environment variables in the Vercel dashboard.

## 📊 Google Ads API Integration

This dashboard uses the Google Ads API to fetch real-time data:

* **MCC Account**: Multi-country management capability
* **Real-time Metrics**: Campaign performance, impressions, clicks, costs
* **Secure Authentication**: OAuth 2.0 flow with refresh token storage

## 🔒 Security

* All sensitive credentials are stored in environment variables
* API keys and tokens are never committed to the repository
* Proper `.gitignore` configuration prevents accidental credential exposure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

---

**Status**: ✅ Production Ready - Modern React-based dashboard with full Google Ads API integration 
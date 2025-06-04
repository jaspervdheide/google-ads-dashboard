# Google Ads Dashboard

A comprehensive PPC management tool for managing Google Ads campaigns across multiple countries.

## Project Structure

This project contains two implementations of the Google Ads dashboard:

### 📊 [Streamlit/](./Streamlit/) - Python Implementation
- **Status**: ✅ **Production Ready**
- **Technology**: Python + Streamlit
- **Features**: Multi-country campaign management, real-time metrics
- **Port**: 8501

### ⚛️ [Next.js/](./Next.js/) - Modern Web Implementation  
- **Status**: ✅ **API Working** - Ready for dashboard development
- **Technology**: Next.js + TypeScript + Tailwind CSS
- **Features**: Modern React-based UI, API-first architecture
- **Port**: 3000

## Quick Start

### Run Streamlit Version
```bash
cd Streamlit
source .venv/bin/activate
streamlit run mcc_dashboard.py --server.port 8501
```

### Run Next.js Version
```bash
cd Next.js
npm run dev
```

## Google Ads API Integration

Both implementations successfully connect to the Google Ads API using:
- **MCC Account**: Multi-country management
- **Countries**: NL, DE, BE, FR, UK
- **Real-time Data**: Campaign performance, metrics, account info

## Environment Variables

Both implementations use the same credentials stored in `.env` files:
- `DEVELOPER_TOKEN`
- `CLIENT_ID` 
- `CLIENT_SECRET`
- `REFRESH_TOKEN`
- `MCC_CUSTOMER_ID`

## Next Steps

Choose your preferred implementation:
- **Streamlit**: For quick data analysis and reporting
- **Next.js**: For building a modern, scalable web application

Both are fully functional and ready for further development!

## Features

- **Multi-Country Support**: Manage campaigns for 14 different countries
- **Real-time Data**: Live Google Ads API integration
- **Security**: Environment variable-based configuration
- **Campaign Metrics**: View impressions, clicks, and costs
- **Interactive Interface**: Easy country selection and data visualization

## Country Accounts

The dashboard supports the following country accounts:
- Netherlands (NL)
- Belgium (BE) 
- Germany (DE)
- Denmark (DK)
- Spain (ES)
- Finland (FI)
- France - Ravann (FR)
- France - Tapis (FR)
- Italy (IT)
- Norway (NO)
- Poland (PL)
- Sweden (SE)
- European Union (EU)
- United Kingdom (UK)

## Usage

1. Open your browser to `http://localhost:8501`
2. Select a country from the sidebar
3. View campaign performance metrics
4. Analyze campaign data in the interactive table

## Files

- `mcc_dashboard.py` - Main Streamlit application
- `setup_credentials.py` - Helper script for credential setup
- `.env` - Environment variables (keep secure)
- `requirements.txt` - Python dependencies 
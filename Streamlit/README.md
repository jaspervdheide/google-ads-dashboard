# Google Ads Dashboard - Streamlit Implementation

This directory contains the Streamlit-based implementation of the Google Ads dashboard.

## Files

- `mcc_dashboard.py` - Main Streamlit application
- `requirements.txt` - Python dependencies
- `setup_credentials.py` - Google Ads API credential setup
- `.env` - Environment variables (credentials)
- `.venv/` - Python virtual environment

## Running the Streamlit App

```bash
cd Streamlit
source .venv/bin/activate
streamlit run mcc_dashboard.py --server.port 8501
```

## Features

- Multi-country Google Ads account management
- Campaign performance metrics
- Real-time data from Google Ads API
- Interactive Streamlit interface

## Status

✅ **Working** - Successfully connects to Google Ads API and displays campaign data for multiple countries. 
import os
from dotenv import load_dotenv
import streamlit as st
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from typing import Dict, List, Any

# --- 1. Streamlit page config and title ---
st.set_page_config(page_title="Just Carpets - Multi-Country Dashboard")
st.title("Just Carpets - Multi-Country Dashboard")

# --- Security Status Indicator ---
if os.path.exists('.env'):
    st.success('🔒 Secure Mode: ON (.env loaded)', icon="✅")
else:
    st.warning('⚠️ Secure Mode: OFF (.env not found)', icon="⚠️")

# --- Warn if any YAML credential files are present ---
yaml_files = [f for f in os.listdir('.') if f.endswith('.yaml') or f.endswith('.yml')]
if any('google-ads' in f for f in yaml_files):
    st.warning(f"YAML credential file(s) detected: {', '.join(yaml_files)}. Please delete them for maximum security.")

# --- 2. Country mapping ---
COUNTRY_ACCOUNTS = {
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
    "EU": "6542318847",
    "UK": "8163355443"
}

# --- Load environment variables from .env ---
load_dotenv()

# Helper to get required env var or stop
def get_env_var(key):
    value = os.environ.get(key)
    if not value:
        st.error(f"Missing required environment variable: {key}")
        st.stop()
    return value

# Build Google Ads config from env vars
GOOGLE_ADS_CONFIG = {
    "developer_token": get_env_var("DEVELOPER_TOKEN"),
    "client_id": get_env_var("CLIENT_ID"),
    "client_secret": get_env_var("CLIENT_SECRET"),
    "refresh_token": get_env_var("REFRESH_TOKEN"),
    "login_customer_id": get_env_var("MCC_CUSTOMER_ID"),
    "use_proto_plus": True
}

@st.cache_resource(show_spinner=False)
def get_google_ads_client() -> GoogleAdsClient:
    try:
        return GoogleAdsClient.load_from_dict(GOOGLE_ADS_CONFIG)
    except Exception as e:
        st.error(f"Failed to load Google Ads client: {e}")
        st.stop()

# --- Test connection on startup ---
def test_google_ads_connection(client: GoogleAdsClient) -> bool:
    try:
        customer_service = client.get_service("CustomerService")
        accessible_customers = customer_service.list_accessible_customers()
        if accessible_customers.resource_names:
            st.success("Google Ads API connection successful!", icon="✅")
            return True
        else:
            st.warning("Connected, but no accessible customers found.")
            return False
    except Exception as e:
        st.error(f"Google Ads API connection failed: {e}")
        return False

# --- 4. List accounts under the MCC ---
def list_accounts_under_mcc(client: GoogleAdsClient, mcc_customer_id: str) -> List[Dict[str, Any]]:
    query = """
        SELECT customer_client.client_customer, customer_client.descriptive_name
        FROM customer_client
        WHERE customer_client.level = 1
    """
    ga_service = client.get_service("GoogleAdsService")
    try:
        response = ga_service.search(customer_id=mcc_customer_id, query=query)
        accounts = []
        for row in response:
            accounts.append({
                "id": row.customer_client.client_customer,
                "name": row.customer_client.descriptive_name
            })
        return accounts
    except GoogleAdsException as ex:
        st.error(f"Google Ads API error: {ex}")
        return []
    except Exception as e:
        st.error(f"Unexpected error: {e}")
        return []

# --- 5. Get campaign performance data for a selected account ---
def get_campaign_performance(client: GoogleAdsClient, customer_id: str) -> List[Dict[str, Any]]:
    query = """
        SELECT
            campaign.id,
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros
        FROM campaign
        WHERE campaign.status = 'ENABLED'
    """
    ga_service = client.get_service("GoogleAdsService")
    try:
        response = ga_service.search(customer_id=customer_id, query=query)
        rows = []
        for row in response:
            rows.append({
                "campaign.id": row.campaign.id,
                "campaign.name": row.campaign.name,
                "metrics.impressions": row.metrics.impressions,
                "metrics.clicks": row.metrics.clicks,
                "metrics.cost_micros": row.metrics.cost_micros
            })
        return rows
    except GoogleAdsException as ex:
        st.error(f"Google Ads API error: {ex}")
        return []
    except Exception as e:
        st.error(f"Unexpected error: {e}")
        return []

# --- 6. Sidebar selectbox ---
country = st.sidebar.selectbox("Select Country Account", list(COUNTRY_ACCOUNTS.keys()))
customer_id = COUNTRY_ACCOUNTS[country]

# --- 7. Main logic with loading and error handling ---
client = get_google_ads_client()
test_google_ads_connection(client)

with st.spinner(f"Fetching campaign performance for {country}..."):
    rows = get_campaign_performance(client, customer_id)

if not rows:
    st.info("No campaign data found for this account.")
else:
    total_impressions = sum(row.get("metrics.impressions", 0) or 0 for row in rows)
    total_clicks = sum(row.get("metrics.clicks", 0) or 0 for row in rows)
    total_cost = sum(row.get("metrics.cost_micros", 0) or 0 for row in rows) / 1_000_000

    col1, col2, col3 = st.columns(3)
    col1.metric("Impressions", f"{total_impressions:,}")
    col2.metric("Clicks", f"{total_clicks:,}")
    col3.metric("Cost", f"€{total_cost:,.2f}")

    table_data = []
    for row in rows:
        table_data.append({
            "Campaign ID": row.get("campaign.id"),
            "Campaign Name": row.get("campaign.name"),
            "Impressions": row.get("metrics.impressions", 0),
            "Clicks": row.get("metrics.clicks", 0),
            "Cost (€)": (row.get("metrics.cost_micros", 0) or 0) / 1_000_000
        })
    st.dataframe(table_data) 
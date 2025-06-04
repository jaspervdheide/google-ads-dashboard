import { NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

// Country mapping from the Streamlit implementation
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
  "EU": "6542318847",
  "UK": "8163355443"
};

export async function GET() {
  try {
    console.log('Fetching MCC accounts...');
    
    // Initialize Google Ads client
    const client = new GoogleAdsApi({
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!,
      developer_token: process.env.DEVELOPER_TOKEN!,
    });

    // Get MCC customer
    const mccCustomer = client.Customer({
      customer_id: process.env.MCC_CUSTOMER_ID!,
      refresh_token: process.env.REFRESH_TOKEN!,
    });

    // Query to get all client accounts under MCC
    const query = `
      SELECT 
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.currency_code,
        customer_client.time_zone
      FROM customer_client
      WHERE customer_client.level = 1
    `;

    console.log('Executing MCC accounts query...');
    const results = await mccCustomer.query(query);
    
    // Map results to include country codes
    const accounts = results.map((row: any) => {
      // Extract customer ID from resource name (remove 'customers/' prefix)
      const fullCustomerId = row.customer_client.client_customer;
      const customerId = fullCustomerId.replace('customers/', '');
      
      const countryCode = Object.keys(COUNTRY_ACCOUNTS).find(
        key => COUNTRY_ACCOUNTS[key as keyof typeof COUNTRY_ACCOUNTS] === customerId
      ) || 'Unknown';
      
      return {
        id: customerId, // Use clean customer ID without prefix
        name: row.customer_client.descriptive_name,
        currency: row.customer_client.currency_code,
        timeZone: row.customer_client.time_zone,
        countryCode
      };
    });

    console.log(`Successfully retrieved ${accounts.length} accounts`);
    
    return NextResponse.json({
      success: true,
      message: `✅ Retrieved ${accounts.length} accounts`,
      data: accounts
    });

  } catch (error) {
    console.error('Error fetching MCC accounts:', error);
    
    return NextResponse.json({
      success: false,
      message: "❌ Failed to fetch MCC accounts",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { createCustomer, createGoogleAdsClient } from '@/utils/googleAdsClient';
import { handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

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
};

export async function GET() {
  try {
    logger.apiStart('Accounts', { operation: 'fetch_mcc_accounts' });
    
    // Initialize Google Ads client using utility
    const client = createGoogleAdsClient();

    // Get MCC customer using utility
    const mccCustomer = createCustomer(client, process.env.MCC_CUSTOMER_ID!);

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

    logger.queryStart('MCC Accounts', process.env.MCC_CUSTOMER_ID);
    const results = await mccCustomer.query(query);
    logger.queryComplete('MCC Accounts', results.length, process.env.MCC_CUSTOMER_ID);
    
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

    logger.apiComplete('Accounts', accounts.length);
    
    return createSuccessResponse(accounts, `✅ Retrieved ${accounts.length} MCC accounts`);

  } catch (error) {
    return handleApiError(error, 'MCC Accounts');
  }
} 
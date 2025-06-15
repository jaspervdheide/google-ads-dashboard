import { GoogleAdsApi } from 'google-ads-api';

/**
 * Creates a Google Ads API client instance with environment variables
 * Centralizes client configuration to avoid duplication across API routes
 */
export const createGoogleAdsClient = (): GoogleAdsApi => {
  return new GoogleAdsApi({
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
    developer_token: process.env.DEVELOPER_TOKEN!,
  });
};

/**
 * Creates a customer instance for a specific account
 * @param client - GoogleAdsApi client instance
 * @param customerId - Google Ads customer ID
 * @returns Customer instance ready for queries
 */
export const createCustomer = (client: GoogleAdsApi, customerId: string) => {
  return client.Customer({
    customer_id: customerId,
    refresh_token: process.env.REFRESH_TOKEN!,
    login_customer_id: process.env.MCC_CUSTOMER_ID!,
  });
};

/**
 * Creates both client and customer in one call for convenience
 * @param customerId - Google Ads customer ID  
 * @returns Object with both client and customer instances
 */
export const createGoogleAdsConnection = (customerId: string) => {
  const client = createGoogleAdsClient();
  const customer = createCustomer(client, customerId);
  
  return { client, customer };
}; 
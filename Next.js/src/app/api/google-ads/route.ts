import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const customerId = '5756290882'; // NL account
    logger.apiStart('Google Ads Connection', { customerId });
    
    // Initialize Google Ads client and customer using utility
    const { client: _client, customer } = createGoogleAdsConnection(customerId);
    logger.googleAdsConnection(customerId, 'NL - Just Carpets');

    // Simple GAQL query to test connection
    const query = `
      SELECT 
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone
      FROM customer 
      LIMIT 1
    `;

    logger.googleAdsQuery(query, customerId);
    const results = await customer.query(query);
    logger.queryComplete('Customer Info', results.length, customerId);
    
    // Extract customer data
    const customerData = results[0]?.customer;
    
    if (customerData) {
      logger.apiComplete('Google Ads Connection', 1);
      
      const responseData = {
        customerId: customerData.id,
        name: customerData.descriptive_name,
        currency: customerData.currency_code,
        timeZone: customerData.time_zone,
        country: "NL",
        timestamp: new Date().toISOString()
      };

      return createSuccessResponse(responseData, "✅ Google Ads API connection successful!");
    } else {
      logger.warn('No customer data in results', { customerId });
      return handleApiError(new Error("Query returned empty results"), 'Google Ads Connection');
    }

  } catch (error) {
    return handleApiError(error, 'Google Ads Connection');
  }
} 
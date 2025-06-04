import { NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

export async function GET() {
  try {
    console.log('Initializing Google Ads API client...');
    
    // Initialize Google Ads client with environment variables
    const client = new GoogleAdsApi({
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!,
      developer_token: process.env.DEVELOPER_TOKEN!,
    });

    console.log('Creating customer instance for NL account...');
    
    // Get customer for NL account
    const customer = client.Customer({
      customer_id: '5756290882', // NL account
      refresh_token: process.env.REFRESH_TOKEN!,
      login_customer_id: process.env.MCC_CUSTOMER_ID!, // Add MCC customer ID for permission
    });

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

    console.log('Executing GAQL query:', query);
    const results = await customer.query(query);
    console.log('Query results:', results);
    
    // Extract customer data
    const customerData = results[0]?.customer;
    
    if (customerData) {
      console.log('Successfully retrieved customer data:', customerData);
      return NextResponse.json({
        success: true,
        message: "✅ Google Ads API connection successful!",
        data: {
          customerId: customerData.id,
          name: customerData.descriptive_name,
          currency: customerData.currency_code,
          timeZone: customerData.time_zone,
          country: "NL",
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log('No customer data in results');
      return NextResponse.json({
        success: false,
        message: "❌ No customer data returned",
        error: "Query returned empty results"
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Google Ads API Error (full):', error);
    console.error('Error name:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Better error serialization
    let errorMessage = 'Unknown error';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      };
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error, null, 2);
      errorDetails = error;
    } else {
      errorMessage = String(error);
    }
    
    return NextResponse.json({
      success: false,
      message: "❌ Google Ads API connection failed",
      error: errorMessage,
      errorType: error?.constructor?.name || typeof error,
      errorDetails,
      details: {
        timestamp: new Date().toISOString(),
        customerId: '5756290882'
      }
    }, { status: 500 });
  }
} 
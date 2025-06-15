import { NextResponse } from 'next/server';

/**
 * Standard API Error Response Interface
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  errorType?: string;
  errorDetails?: any;
  statusCode?: number;
}

/**
 * Standard API Success Response Interface
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
}

/**
 * Google Ads specific error types
 */
export enum GoogleAdsErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CUSTOMER_NOT_ENABLED = 'CUSTOMER_NOT_ENABLED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_CUSTOMER_ID = 'INVALID_CUSTOMER_ID',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Determines the Google Ads error type from error message
 */
function categorizeGoogleAdsError(error: any): GoogleAdsErrorType {
  const errorMessage = error?.message || error?.toString() || '';
  const errorLower = errorMessage.toLowerCase();

  if (errorLower.includes('quota') || errorLower.includes('rate limit')) {
    return GoogleAdsErrorType.QUOTA_EXCEEDED;
  }
  
  if (errorLower.includes('not yet enabled') || errorLower.includes('deactivated')) {
    return GoogleAdsErrorType.CUSTOMER_NOT_ENABLED;
  }
  
  if (errorLower.includes('authentication') || errorLower.includes('token')) {
    return GoogleAdsErrorType.AUTHENTICATION_ERROR;
  }
  
  if (errorLower.includes('permission') || errorLower.includes('access denied')) {
    return GoogleAdsErrorType.PERMISSION_DENIED;
  }
  
  if (errorLower.includes('customer') && errorLower.includes('invalid')) {
    return GoogleAdsErrorType.INVALID_CUSTOMER_ID;
  }
  
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return GoogleAdsErrorType.NETWORK_ERROR;
  }
  
  if (error?.errors && Array.isArray(error.errors)) {
    return GoogleAdsErrorType.API_ERROR;
  }
  
  return GoogleAdsErrorType.UNKNOWN_ERROR;
}

/**
 * Gets user-friendly error message for Google Ads errors
 */
function getUserFriendlyMessage(errorType: GoogleAdsErrorType, originalMessage: string): string {
  switch (errorType) {
    case GoogleAdsErrorType.QUOTA_EXCEEDED:
      return 'API quota exceeded. Please try again later.';
    
    case GoogleAdsErrorType.CUSTOMER_NOT_ENABLED:
      return 'This Google Ads account is not enabled or has been deactivated.';
    
    case GoogleAdsErrorType.AUTHENTICATION_ERROR:
      return 'Authentication failed. Please check API credentials.';
    
    case GoogleAdsErrorType.PERMISSION_DENIED:
      return 'Permission denied. Check account access permissions.';
    
    case GoogleAdsErrorType.INVALID_CUSTOMER_ID:
      return 'Invalid customer ID provided.';
    
    case GoogleAdsErrorType.NETWORK_ERROR:
      return 'Network connection error. Please try again.';
    
    case GoogleAdsErrorType.API_ERROR:
      return `Google Ads API error: ${originalMessage}`;
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Handles validation errors (400 status)
 */
export function handleValidationError(message: string): NextResponse<ApiErrorResponse> {
  console.error(`❌ Validation Error: ${message}`);
  
  return NextResponse.json({
    success: false,
    message,
    errorType: 'VALIDATION_ERROR',
    statusCode: 400
  }, { status: 400 });
}

/**
 * Handles Google Ads API errors with intelligent categorization
 */
export function handleGoogleAdsError(
  error: any, 
  context: string = 'Google Ads API'
): NextResponse<ApiErrorResponse> {
  const errorType = categorizeGoogleAdsError(error);
  const originalMessage = error?.message || error?.toString() || 'Unknown error';
  const userMessage = getUserFriendlyMessage(errorType, originalMessage);
  
  // Log detailed error for debugging
  console.error(`❌ ${context} Error (${errorType}):`, {
    originalMessage,
    errorType,
    errorDetails: error?.errors || error,
    stack: error?.stack
  });
  
  // Determine status code based on error type
  let statusCode = 500;
  switch (errorType) {
    case GoogleAdsErrorType.CUSTOMER_NOT_ENABLED:
    case GoogleAdsErrorType.INVALID_CUSTOMER_ID:
      statusCode = 404;
      break;
    case GoogleAdsErrorType.AUTHENTICATION_ERROR:
    case GoogleAdsErrorType.PERMISSION_DENIED:
      statusCode = 401;
      break;
    case GoogleAdsErrorType.QUOTA_EXCEEDED:
      statusCode = 429;
      break;
    default:
      statusCode = 500;
  }
  
  return NextResponse.json({
    success: false,
    message: userMessage,
    error: originalMessage,
    errorType,
    errorDetails: error?.errors || undefined,
    statusCode
  }, { status: statusCode });
}

/**
 * Handles general server errors (500 status)
 */
export function handleServerError(
  error: any, 
  context: string = 'Server'
): NextResponse<ApiErrorResponse> {
  const errorMessage = error?.message || error?.toString() || 'Unknown server error';
  
  console.error(`❌ ${context} Error:`, {
    message: errorMessage,
    stack: error?.stack,
    error
  });
  
  return NextResponse.json({
    success: false,
    message: `Failed to ${context.toLowerCase()}`,
    error: errorMessage,
    errorType: 'SERVER_ERROR',
    statusCode: 500
  }, { status: 500 });
}

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    message,
    data
  });
}

/**
 * Standardized error handler for API routes
 * Automatically categorizes and handles different types of errors
 */
export function handleApiError(
  error: any,
  context: string = 'API'
): NextResponse<ApiErrorResponse> {
  // Check if it's a Google Ads API error
  if (error?.errors || 
      error?.message?.includes('google.ads') ||
      error?.constructor?.name === 'GoogleAdsError' ||
      error?.message?.includes('Customer') ||
      error?.message?.includes('quota') ||
      error?.message?.includes('enabled')) {
    return handleGoogleAdsError(error, context);
  }
  
  // Handle other server errors
  return handleServerError(error, context);
}

/**
 * Wrapper function for API route error handling
 * Usage: return withErrorHandling(async () => { ... your api logic ... }, 'API Context');
 */
export async function withErrorHandling<T>(
  apiLogic: () => Promise<NextResponse<ApiSuccessResponse<T>>>,
  context: string = 'API'
): Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>> {
  try {
    return await apiLogic();
  } catch (error) {
    return handleApiError(error, context);
  }
} 
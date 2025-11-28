# Google Ads Dashboard Setup

## Environment Variables

The 500 error you're seeing is because the Google Ads API credentials are missing. You need to create a `.env.local` file in the root of the Next.js directory with the following variables:

```env
# Google Ads API Credentials
# Get these from: https://console.developers.google.com/
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here

# Google Ads Developer Token
# Apply for one at: https://developers.google.com/google-ads/api/docs/get-started/dev-token
DEVELOPER_TOKEN=your_developer_token_here

# OAuth2 Refresh Token
# Generate using Google OAuth2 Playground: https://developers.google.com/oauthplayground/
REFRESH_TOKEN=your_refresh_token_here

# MCC (Manager) Customer ID (format: 1234567890, without dashes)
MCC_CUSTOMER_ID=your_mcc_customer_id_here
```

## Getting Your Credentials

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Ads API
4. Create OAuth 2.0 credentials
5. Note down your `CLIENT_ID` and `CLIENT_SECRET`

### 2. Developer Token
1. Visit [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Apply for a developer token
3. Note: Test accounts can use their token immediately, production requires approval

### 3. Refresh Token
1. Go to [Google OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your CLIENT_ID and CLIENT_SECRET
5. In the left panel, find "Google Ads API v16" and select `https://www.googleapis.com/auth/adwords`
6. Click "Authorize APIs"
7. Sign in with your Google Ads account
8. Click "Exchange authorization code for tokens"
9. Copy the `refresh_token` value

### 4. MCC Customer ID
1. Log into your Google Ads Manager account
2. Find your Customer ID in the top right (format: 123-456-7890)
3. Remove the dashes: 1234567890

## After Setup

1. Create the `.env.local` file with your credentials
2. Restart the dev server: `npm run dev`
3. The dashboard should now load at `http://localhost:3000` (or `http://localhost:3002`)

## Fixed Issues

✅ **Viewport Warning**: Moved viewport configuration from `metadata` to separate `viewport` export in `layout.tsx` as per Next.js 15 requirements.




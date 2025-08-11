# Google OAuth Setup Guide

To enable Google Sheets integration in TeamSync, you need to configure Google OAuth credentials.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the OAuth consent screen if prompted:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, etc.)
   - Add your email to test users
4. For Application type, select "Web application"
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `http://localhost:3000/api/auth/callback/google` (for NextAuth)

## Step 3: Configure Environment Variables

1. Copy your Client ID and Client Secret from the Google Cloud Console
2. Update the `.env.local` file with your credentials:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

## Step 4: Restart the Development Server

After updating the environment variables:

```bash
npm run dev
```

## Required Scopes

The application requests these Google API scopes:
- `https://www.googleapis.com/auth/spreadsheets` - Read and write Google Sheets
- `https://www.googleapis.com/auth/drive.file` - Create and manage Google Drive files

## Troubleshooting

- **"Access blocked" error**: Ensure your OAuth consent screen is properly configured
- **"Invalid client" error**: Check that your Client ID and Secret are correct
- **"Redirect URI mismatch"**: Verify the redirect URI in Google Cloud Console matches exactly

## Security Notes

- Never commit your actual credentials to version control
- Use different credentials for development and production
- Regularly rotate your client secrets
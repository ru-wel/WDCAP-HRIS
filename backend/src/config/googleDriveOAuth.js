import { google } from 'googleapis';

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) return null;

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const getOAuthDriveClient = () => {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) return null;

  const oauth2 = getOAuth2Client();
  if (!oauth2) return null;

  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2 });
};

export const getOAuth2ClientForSetup = () => getOAuth2Client();

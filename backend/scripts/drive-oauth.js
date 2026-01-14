#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getOAuth2ClientForSetup } from '../src/config/googleDriveOAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is loaded when running via `npm run drive:oauth:*`.
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const action = process.argv[2];

const oauth2 = getOAuth2ClientForSetup();
if (!oauth2) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URI in backend/.env');
  process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/drive'];

if (action === 'url') {
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  });
  console.log(url);
  process.exit(0);
}

if (action === 'token') {
  const code = process.argv[3] || process.env.GOOGLE_OAUTH_CODE;
  if (!code) {
    console.error('Provide the code: node scripts/drive-oauth.js token "<code>"');
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    console.log('TOKENS_JSON=' + JSON.stringify(tokens, null, 2));
    console.log('\nIMPORTANT: Copy this to backend/.env as GOOGLE_OAUTH_REFRESH_TOKEN=...');
    console.log('GOOGLE_OAUTH_REFRESH_TOKEN=' + (tokens.refresh_token || ''));
    if (!tokens.refresh_token) {
      console.log('\nNo refresh_token returned. Make sure you used prompt=consent and access_type=offline, and that you are not reusing an already-consented app without revoking access.');
    }
    process.exit(0);
  } catch (e) {
    console.error('Token exchange failed:', e?.message || e);
    process.exit(2);
  }
}

console.log('Usage:');
console.log('  node scripts/drive-oauth.js url');
console.log('  node scripts/drive-oauth.js token "<code>"');
process.exit(1);

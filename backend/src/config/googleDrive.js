import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { getOAuthDriveClient } from './googleDriveOAuth.js';

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readServiceAccountFromPath = (jsonPath) => {
  if (!jsonPath) return null;
  try {
    const absolutePath = path.isAbsolute(jsonPath)
      ? jsonPath
      : path.resolve(process.cwd(), jsonPath);

    if (!fs.existsSync(absolutePath)) return null;
    const raw = fs.readFileSync(absolutePath, 'utf8');
    return safeJsonParse(raw);
  } catch {
    return null;
  }
};

const extractMultilineEnvJsonBlock = (envText, keyName) => {
  const lineStart = `${keyName}=`;
  const startIndex = envText.indexOf(lineStart);
  if (startIndex === -1) return null;

  const afterEqualsIndex = startIndex + lineStart.length;
  const afterEquals = envText.slice(afterEqualsIndex);

  // If it's single-line, use that line.
  const firstNewline = afterEquals.indexOf('\n');
  const firstLine = (firstNewline === -1 ? afterEquals : afterEquals.slice(0, firstNewline)).trim();
  if (firstLine && firstLine !== '{') return firstLine;

  // Multi-line fallback: capture lines until a blank line or another KEY= entry.
  const lines = afterEquals.split(/\r?\n/);
  const collected = [];
  for (const line of lines) {
    if (!line.trim()) break;
    // Stop if we hit another env assignment (basic heuristic).
    if (/^[A-Z0-9_]+\s*=/.test(line) && collected.length > 0) break;
    collected.push(line);
  }

  const block = collected.join('\n').trim();
  return block || null;
};

const readServiceAccountFromEnvFile = () => {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'backend/.env')
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const envText = fs.readFileSync(filePath, 'utf8');
      const block = extractMultilineEnvJsonBlock(envText, 'GOOGLE_SERVICE_ACCOUNT_JSON');
      if (!block) continue;
      const parsed = safeJsonParse(block);
      if (parsed) return parsed;
    } catch {
      // ignore and try next
    }
  }

  return null;
};

const decodeServiceAccount = () => {
  // Recommended: a path to a JSON file (avoids .env quoting/newline issues)
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  const fromPath = readServiceAccountFromPath(jsonPath);
  if (fromPath) return fromPath;

  // Common: raw JSON string
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const parsed = safeJsonParse(raw);
    if (parsed) return parsed;
  }

  // Common: base64 JSON string
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (b64) {
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      const parsed = safeJsonParse(json);
      if (parsed) return parsed;
    } catch {
      // fall through
    }
  }

  // Local-dev convenience: if GOOGLE_SERVICE_ACCOUNT_JSON was written as a multi-line block
  // in .env, dotenv cannot parse it correctly. We try to recover by reading the file directly.
  return readServiceAccountFromEnvFile();
};

export const getDriveClient = () => {
  // Prefer OAuth (works with personal Gmail Drive)
  const oauthDrive = getOAuthDriveClient();
  if (oauthDrive) return oauthDrive;

  const serviceAccount = decodeServiceAccount();
  if (!serviceAccount?.client_email || !serviceAccount?.private_key) return null;

  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return google.drive({ version: 'v3', auth });
};

import { Readable } from 'node:stream';
import { getDriveClient } from '../config/googleDrive.js';
import logger from '../utils/logger.js';
import { InternalServerError } from '../utils/errors.js';

const getParentFolderId = () => process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || null;

const PERSONNEL_ROOT_FOLDERS = {
  EMPLOYEES: 'Employees',
  CONTRACTORS: 'Contractors'
};

const folderCache = new Map();

const sanitizeFolderName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Employee';
  // Drive folder names can include spaces, but we keep it tidy.
  return raw.replace(/\s+/g, ' ').slice(0, 120);
};

const escapeDriveQueryString = (value) => String(value || '').replace(/'/g, "\\'");

const normalizeEmail = (value) => {
  const e = String(value || '').trim().toLowerCase();
  return e || '';
};

const normalizePersonnelType = (value) => String(value || '').trim().toLowerCase();

const isProjectBasedPersonnel = (personnelType) => {
  const v = normalizePersonnelType(personnelType);
  return v === 'project-based' || v.includes('project');
};

const getRootFolderNameForPersonnelType = (personnelType) => (
  isProjectBasedPersonnel(personnelType)
    ? PERSONNEL_ROOT_FOLDERS.CONTRACTORS
    : PERSONNEL_ROOT_FOLDERS.EMPLOYEES
);

const getOrCreatePersonnelRootFolder = async (personnelType) => {
  const parentId = getParentFolderId();
  const rootName = getRootFolderNameForPersonnelType(personnelType);
  // If no parent folder is configured, we fall back to the Drive root.
  return getOrCreateFolder({ name: rootName, parentId });
};

export const ensureDriveUserAccess = async ({ fileId, email, role = 'reader' }) => {
  const drive = getDriveClient();
  if (!drive) throw new InternalServerError('Google Drive is not configured');
  if (!fileId) return { skipped: true };

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { skipped: true };

  const safeRole = role === 'writer' || role === 'commenter' || role === 'reader' ? role : 'reader';

  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role: safeRole,
        emailAddress: normalizedEmail
      },
      sendNotificationEmail: false,
      supportsAllDrives: true,
      fields: 'id'
    });

    return { skipped: false };
  } catch (err) {
    const status = err?.code || err?.response?.status;
    const reason = err?.errors?.[0]?.reason;

    // "duplicate" happens when the permission already exists.
    if (status === 409 || reason === 'duplicate') {
      return { skipped: false, duplicate: true };
    }

    // Do not block core workflows if sharing fails (e.g., domain policy).
    logger.warn(`Drive permission share failed for ${normalizedEmail}: ${err?.message || err}`);
    return { skipped: false, error: err?.message || String(err) };
  }
};

export const getOrCreateFolder = async ({ name, parentId = null }) => {
  const drive = getDriveClient();
  if (!drive) throw new InternalServerError('Google Drive is not configured');

  const folderName = sanitizeFolderName(name);
  const cacheKey = `${parentId || 'root'}::${folderName}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey);

  try {
    const qParts = [
      "mimeType='application/vnd.google-apps.folder'",
      `name='${escapeDriveQueryString(folderName)}'`,
      'trashed=false'
    ];
    if (parentId) qParts.push(`'${escapeDriveQueryString(parentId)}' in parents`);

    const list = await drive.files.list({
      q: qParts.join(' and '),
      fields: 'files(id,name)',
      spaces: 'drive',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });

    const existing = (list.data.files || [])[0];
    if (existing?.id) {
      const result = { folderId: existing.id, name: existing.name };
      folderCache.set(cacheKey, result);
      return result;
    }

    const parents = [];
    if (parentId) parents.push(parentId);

    const created = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parents.length ? parents : undefined
      },
      fields: 'id,name',
      supportsAllDrives: true
    });

    const result = { folderId: created.data.id, name: created.data.name };
    folderCache.set(cacheKey, result);
    return result;
  } catch (err) {
    logger.error('Drive folder get/create failed:', err);
    const status = err?.code || err?.response?.status;
    const reason = err?.errors?.[0]?.reason;
    if (reason === 'storageQuotaExceeded') {
      throw new InternalServerError(
        'Google Drive upload is not possible with a Service Account on a personal Gmail Drive (no storage quota). Use a Google Workspace Shared Drive, or switch to OAuth (sign-in) based Drive access, or use Supabase storage.'
      );
    }
    if (status === 403 || status === 404) {
      throw new InternalServerError(
        'Failed to access Google Drive folder. Ensure the parent folder ID is correct and the folder is shared with the service account email.'
      );
    }
    throw new InternalServerError('Failed to prepare Google Drive folder');
  }
};

export const getOrCreateEmployeeFolder = async ({ employeeCode, firstName, lastName, personnelType = null }) => {
  const root = await getOrCreatePersonnelRootFolder(personnelType);
  const parentId = root?.folderId || getParentFolderId();
  const safeEmp = String(employeeCode || '').trim() || 'employee';
  const safeName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
  const folderName = safeName ? `${safeEmp} - ${safeName}` : safeEmp;
  return getOrCreateFolder({ name: folderName, parentId });
};

export const isDriveEnabled = () => {
  const provider = String(process.env.DOCUMENT_STORAGE_PROVIDER || '').trim().toLowerCase();
  return provider === 'google_drive' || provider === 'drive';
};

export const uploadToDrive = async ({ fileBuffer, mimeType, fileName, parentFolderId = null }) => {
  const drive = getDriveClient();
  if (!drive) throw new InternalServerError('Google Drive is not configured');

  try {
    const parents = [];
    if (parentFolderId) {
      parents.push(parentFolderId);
    } else {
      const folderId = getParentFolderId();
      if (folderId) parents.push(folderId);
    }

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: parents.length ? parents : undefined
      },
      media: {
        mimeType,
        body: Readable.from(fileBuffer)
      },
      fields: 'id,name,mimeType',
      supportsAllDrives: true
    });

    return {
      fileId: res.data.id,
      name: res.data.name,
      mimeType: res.data.mimeType
    };
  } catch (err) {
    logger.error('Drive upload failed:', err);
    const status = err?.code || err?.response?.status;
    const reason = err?.errors?.[0]?.reason;
    if (reason === 'storageQuotaExceeded') {
      throw new InternalServerError(
        'Google Drive upload is not possible with a Service Account on a personal Gmail Drive (no storage quota). Use a Google Workspace Shared Drive, or switch to OAuth (sign-in) based Drive access, or use Supabase storage.'
      );
    }
    if (status === 403 || status === 404) {
      throw new InternalServerError(
        'Failed to upload to Google Drive. Check folder permissions (share the folder with the service account) and verify the parent folder ID.'
      );
    }
    throw new InternalServerError('Failed to upload file to Google Drive');
  }
};

export const downloadFromDrive = async (fileId) => {
  const drive = getDriveClient();
  if (!drive) throw new InternalServerError('Google Drive is not configured');

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType',
      supportsAllDrives: true
    });

    const streamRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    return {
      fileName: meta.data.name,
      mimeType: meta.data.mimeType,
      stream: streamRes.data
    };
  } catch (err) {
    logger.error('Drive download failed:', err);
    throw new InternalServerError('Failed to download file from Google Drive');
  }
};

export const deleteFromDrive = async (fileId) => {
  const drive = getDriveClient();
  if (!drive) throw new InternalServerError('Google Drive is not configured');
  if (!fileId) return;

  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true
    });
  } catch (err) {
    // Best-effort cleanup; do not block main flow.
    logger.warn('Drive delete failed:', err?.message || err);
  }
};

export const getDriveWebViewLink = async (fileId) => {
  const drive = getDriveClient();
  if (!drive) throw new InternalServerError('Google Drive is not configured');
  if (!fileId) throw new InternalServerError('Missing Google Drive fileId');

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'id,name,mimeType,webViewLink',
      supportsAllDrives: true
    });

    return {
      fileId: meta.data.id,
      name: meta.data.name,
      mimeType: meta.data.mimeType,
      webViewLink: meta.data.webViewLink
    };
  } catch (err) {
    logger.error('Drive webViewLink fetch failed:', err);
    throw new InternalServerError('Failed to generate Google Drive preview link');
  }
};

export const driveFileExists = async (fileId) => {
  const drive = getDriveClient();
  if (!drive) throw new InternalServerError('Google Drive is not configured');
  if (!fileId) return false;

  try {
    await drive.files.get({
      fileId,
      fields: 'id',
      supportsAllDrives: true
    });
    return true;
  } catch (err) {
    const status = err?.code || err?.response?.status;
    const reason = err?.errors?.[0]?.reason;

    // If user deleted the file (or it was never there), Drive returns 404.
    if (status === 404 || reason === 'notFound') return false;

    // For other errors (permission, rate limit, etc), do not silently treat as missing.
    throw new InternalServerError('Failed to verify Google Drive file existence');
  }
};

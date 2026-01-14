import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, BadRequestError } from "../utils/errors.js";
import { AUDIT_ACTIONS, FILE_VALIDATION, ONBOARDING_STATUSES } from "../config/constants.js";
import logger from "../utils/logger.js";
import { deleteFromDrive, downloadFromDrive, ensureDriveUserAccess, getDriveWebViewLink, getOrCreateEmployeeFolder, isDriveEnabled, uploadToDrive } from './googleDrive.service.js';

const sanitizeForFileName = (value) => String(value || '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, '_');

const docTypeToPrefix = (documentName) => {
  // Example: "Employee Contract" -> "EmployeeContract", "Resume/CV" -> "ResumeCV"
  const raw = String(documentName || 'Document').replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!raw) return 'Document';
  return raw
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z0-9]+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join('');
};

const getExtension = (fileName) => {
  const raw = String(fileName || '');
  const dot = raw.lastIndexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return '';
  return raw.slice(dot + 1).toLowerCase();
};

const getExistingDocumentForChecklistItem = async ({ checklistItemId, employeeId }) => {
  if (!checklistItemId) return null;

  const { data: checklist, error } = await supabase
    .from('onboarding_checklists')
    .select('id, document_id')
    .eq('id', checklistItemId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) throw new InternalServerError(error.message);
  if (!checklist?.document_id) return null;

  try {
    return await getDocumentById(checklist.document_id);
  } catch {
    return null;
  }
};

const getLatestDocumentForEmployeeType = async ({ employeeId, documentName }) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('document_name', documentName)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new InternalServerError(error.message);
  return data || null;
};

// upload a document
export const uploadDocument = async (fileData, userId) => {
  try {
    const { employee_id, document_name, file, file_name, file_type, file_size, checklist_item_id } = fileData;

    // check if employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name, personnel_type')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      throw new NotFoundError('Employee not found');
    }

    // validate file size
    if (file_size > FILE_VALIDATION.MAX_FILE_SIZE) {
      const maxMb = Math.round((FILE_VALIDATION.MAX_FILE_SIZE / (1024 * 1024)) * 10) / 10;
      throw new BadRequestError(`File size exceeds maximum limit of ${maxMb} MB`);
    }

    // validate file type
    if (!FILE_VALIDATION.ALLOWED_MIME_TYPES.includes(file_type)) {
      throw new BadRequestError(`File type ${file_type} is not allowed. Allowed types: ${FILE_VALIDATION.ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // Special rule: Employee Photo must be JPEG only.
    if (String(document_name || '').trim().toLowerCase() === 'employee photo' && String(file_type || '').toLowerCase() !== 'image/jpeg') {
      throw new BadRequestError('Employee Photo must be a JPEG image (.jpg/.jpeg) only.');
    }

    // If this upload comes from an onboarding checklist item, prefer replacing its existing document.
    // Otherwise, replace the latest document for the same employee+document_name to prevent duplicates.
    const existingForChecklist = await getExistingDocumentForChecklistItem({
      checklistItemId: checklist_item_id,
      employeeId: employee_id
    });
    const existingDocument = existingForChecklist || (await getLatestDocumentForEmployeeType({
      employeeId: employee_id,
      documentName: document_name
    }));

    let storedPathOrId = null;
    let storageProvider = 'supabase';
    let uploadedStorageHandle = null;

    if (isDriveEnabled()) {
      storageProvider = 'google_drive';

      const employeeFolder = await getOrCreateEmployeeFolder({
        employeeCode: employee.employee_id,
        firstName: employee.first_name,
        lastName: employee.last_name,
        personnelType: employee.personnel_type
      });

      // Best-effort: share the employee folder + uploaded files to the employee's linked user email.
      // This enables Drive preview links for accounts other than the Drive owner.
      let employeeEmail = '';
      try {
        const { data: employeeUser } = await supabase
          .from('users')
          .select('email')
          .eq('employee_id', employee.employee_id)
          .maybeSingle();
        employeeEmail = employeeUser?.email || '';
      } catch (e) {
        logger.warn('Failed to lookup employee user email for Drive sharing:', e?.message || e);
      }

      if (employeeEmail) {
        await ensureDriveUserAccess({ fileId: employeeFolder.folderId, email: employeeEmail, role: 'reader' });
      }

      const prefix = docTypeToPrefix(document_name);
      const empName = sanitizeForFileName(`${employee.first_name || ''} ${employee.last_name || ''}`.trim()) || sanitizeForFileName(employee.employee_id);
      const ext = getExtension(file_name);
      const driveName = ext ? `${prefix}_${empName}.${ext}` : `${prefix}_${empName}`;

      const driveUpload = await uploadToDrive({
        fileBuffer: file,
        mimeType: file_type,
        fileName: driveName,
        parentFolderId: employeeFolder.folderId
      });
      storedPathOrId = driveUpload.fileId;
      uploadedStorageHandle = driveUpload.fileId;

      if (employeeEmail) {
        await ensureDriveUserAccess({ fileId: driveUpload.fileId, email: employeeEmail, role: 'reader' });
      }
    } else {
      // generate unique file path: employee_id/timestamp_filename
      const timestamp = Date.now();
      const filePath = `${employee.employee_id}/${timestamp}_${file_name}`;

      // upload to supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET_DOCUMENTS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file_type
        });

      if (uploadError) {
        logger.error('File upload error:', uploadError);
        throw new InternalServerError('Failed to upload file to storage: ' + uploadError.message);
      }

      storedPathOrId = uploadData.path;
      uploadedStorageHandle = uploadData.path;
    }

    const nowIso = new Date().toISOString();
    const oldDocument = existingDocument || null;

    // Update existing record (reupload) or insert new.
    let savedDocument;
    if (oldDocument) {
      const { data: updated, error: updateError } = await supabase
        .from('documents')
        .update({
          file_path: storedPathOrId,
          file_name,
          file_type,
          file_size,
          uploaded_by: userId,
          uploaded_at: nowIso
        })
        .eq('id', oldDocument.id)
        .select()
        .single();

      if (updateError) {
        // rollback newly uploaded object
        if (storageProvider === 'supabase') {
          await supabase.storage.from(process.env.STORAGE_BUCKET_DOCUMENTS).remove([uploadedStorageHandle]);
        } else {
          await deleteFromDrive(uploadedStorageHandle);
        }
        throw new InternalServerError('Failed to update document: ' + updateError.message);
      }

      // Best-effort cleanup of old storage object to avoid duplicates
      if (storageProvider === 'supabase') {
        if (oldDocument.file_path && oldDocument.file_path !== storedPathOrId) {
          await supabase.storage.from(process.env.STORAGE_BUCKET_DOCUMENTS).remove([oldDocument.file_path]);
        }
      } else {
        if (oldDocument.file_path && oldDocument.file_path !== storedPathOrId) {
          await deleteFromDrive(oldDocument.file_path);
        }
      }

      savedDocument = updated;

      await supabase.from('audit_logs').insert({
        user_id: userId,
        action_type: AUDIT_ACTIONS.UPDATE,
        table_name: 'documents',
        record_id: savedDocument.id,
        old_values: oldDocument,
        new_values: savedDocument,
        timestamp: nowIso
      });
    } else {
      const { data: created, error: insertError } = await supabase
        .from('documents')
        .insert({
          employee_id,
          document_name,
          file_path: storedPathOrId,
          file_name,
          file_type,
          file_size,
          uploaded_by: userId,
          uploaded_at: nowIso
        })
        .select()
        .single();

      if (insertError) {
        // rollback/delete uploaded file if database insert fails
        if (storageProvider === 'supabase') {
          await supabase.storage.from(process.env.STORAGE_BUCKET_DOCUMENTS).remove([uploadedStorageHandle]);
        } else {
          await deleteFromDrive(uploadedStorageHandle);
        }

        throw new InternalServerError('Failed to save document metadata: ' + insertError.message);
      }

      savedDocument = created;

      await supabase.from('audit_logs').insert({
        user_id: userId,
        action_type: AUDIT_ACTIONS.CREATE,
        table_name: 'documents',
        record_id: savedDocument.id,
        new_values: savedDocument,
        timestamp: nowIso
      });
    }

    if (checklist_item_id) {
      try {
        // Update the checklist item with the document link and submitted status
        const { error: checklistError } = await supabase
          .from('onboarding_checklists')
          .update({
            document_id: savedDocument.id,
            status: ONBOARDING_STATUSES.SUBMITTED,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', checklist_item_id)
          .eq('employee_id', employee_id);  // ensure checklist belongs to employee

        if (checklistError) {
          logger.error('Failed to update checklist item:', checklistError);
        } else {
          logger.info(`Checklist item ${checklist_item_id} updated with document ${savedDocument.id}`);
        }
      } catch (checklistUpdateError) {
        logger.error('Error updating checklist:', checklistUpdateError);
      }
    }

    logger.info(`Document uploaded: ${document_name} for employee ${employee.employee_id} by user ${userId}`);

    return savedDocument;

  } catch (error) {
    logger.error('Error uploading document:', error);
    throw error;
  }
};

// get all documents for an employee
export const getDocumentsByEmployee = async (employeeId) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return documents || [];

  } catch (error) {
    logger.error(`Error fetching documents for employee ${employeeId}`, error);
    throw error;
  }
};

// get a single document by ID
export const getDocumentById = async (documentId) => {
  try {
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !document) {
      throw new NotFoundError('Document not found');
    }

    return document;

  } catch (error) {
    logger.error(`Error fetching document ${documentId}`, error);
    throw error;
  }
};

// download a document (returns signed URL)
export const downloadDocument = async (documentId, userId) => {
  try {
    // fetch document metadata
    const document = await getDocumentById(documentId);

    if (isDriveEnabled()) {
      // For Drive-backed documents we stream through the backend (no signed URL concept)
      // Controller will call downloadFromDrive when serving the file.
      return {
        document,
        provider: 'google_drive'
      };
    }

    // generate signed url from supabase
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET_DOCUMENTS)
      .createSignedUrl(document.file_path, 3600); // link expires in 1 hour

    if (urlError) {
      throw new InternalServerError('Failed to generate download URL: ' + urlError.message);
    }

    logger.info(`Document download URL generated: ${document.document_name} (${document.id})`);

    return {
      document,
      provider: 'supabase',
      signedUrl: signedUrlData.signedUrl
    };

  } catch (error) {
    logger.error(`Error downloading document ${documentId}:`, error);
    throw error;
  }
};

export const previewDocument = async (documentId) => {
  const document = await getDocumentById(documentId);

  if (isDriveEnabled()) {
    const meta = await getDriveWebViewLink(document.file_path);
    return {
      document,
      provider: 'google_drive',
      url: meta.webViewLink,
      fileName: meta.name,
      mimeType: meta.mimeType
    };
  }

  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from(process.env.STORAGE_BUCKET_DOCUMENTS)
    .createSignedUrl(document.file_path, 3600);

  if (urlError) {
    throw new InternalServerError('Failed to generate preview URL: ' + urlError.message);
  }

  return {
    document,
    provider: 'supabase',
    url: signedUrlData.signedUrl,
    fileName: document.file_name,
    mimeType: document.file_type
  };
};

// delete a document
export const deleteDocument = async (documentId, userId) => {
  try {
    // fetch existing document
    const document = await getDocumentById(documentId);

    // unlink from onboarding checklist (if this document was uploaded via checklist)
    try {
      await supabase
        .from('onboarding_checklists')
        .update({
          document_id: null,
          status: ONBOARDING_STATUSES.PENDING,
          submitted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('document_id', documentId);
    } catch (e) {
      logger.warn('Failed to unlink onboarding checklist document:', e?.message || e);
    }

    // delete file from storage
    if (isDriveEnabled()) {
      await deleteFromDrive(document.file_path);
    } else {
      const { error: storageError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET_DOCUMENTS)
        .remove([document.file_path]);

      if (storageError) {
        logger.error('Document deletion error:', storageError);
        throw new InternalServerError('Failed to delete file from supabase storage: ' + storageError.message);
      }
    }

    // delete document record from database
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      throw new InternalServerError('Failed to delete document record: ' + deleteError.message);
    }

    // log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: 'documents',
      record_id: documentId,
      old_values: document,
      timestamp: new Date().toISOString()
    });

    logger.info(`Document deleted ${document.document_name} (${documentId}) by user ${userId}`);

    return document;

  } catch (error) {
    logger.error(`Error deleting document ${documentId}`, error);
    throw error;
  }
}

export const streamDriveDocument = async (documentId) => {
  const document = await getDocumentById(documentId);
  const drive = await downloadFromDrive(document.file_path);
  return { document, ...drive };
};
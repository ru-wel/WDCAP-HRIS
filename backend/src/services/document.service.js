import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, BadRequestError } from "../utils/errors.js";
import { AUDIT_ACTIONS, FILE_VALIDATION, ONBOARDING_STATUSES } from "../config/constants.js";
import logger from "../utils/logger.js";

// upload a document
export const uploadDocument = async (fileData, userId) => {
  try {
    const { employee_id, document_name, file, file_name, file_type, file_size, checklist_item_id } = fileData;

    // check if employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')
      .eq('id', employee_id)
      .single();

    if (empError || !employee) {
      throw new NotFoundError('Employee not found');
    }

    // validate file size
    if (file_size > FILE_VALIDATION.MAX_FILE_SIZE) {
      throw new BadRequestError(`File size exceeds maximum limit of 10 MB`);
    }

    // validate file type
    if (!FILE_VALIDATION.ALLOWED_MIME_TYPES.includes(file_type)) {
      throw new BadRequestError(`File type ${file_type} is not allowed. Allowed types: ${FILE_VALIDATION.ALLOWED_EXTENSIONS.join(', ')}`);
    }

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
      })

    if (uploadError) {
      logger.error('File upload error:', uploadError);
      throw new InternalServerError('Failed to upload file to storage: ' + uploadError.message);
    }

    // insert document metadata into database
    const { data: newDocument, error: insertError } = await supabase
      .from('documents')
      .insert({
        employee_id,
        document_name,
        file_path: uploadData.path,
        file_name,
        file_type,
        file_size,
        uploaded_by: userId,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      // rollback/delete uploaded file if database insert fails
      await supabase.storage
        .from(process.env.STORAGE_BUCKET_DOCUMENTS)
        .remove([uploadData.path]);

      throw new InternalServerError('Failed to save document metadata:', insertError.message);
    }

    if (checklist_item_id) {
      try {
        // Update the checklist item with the document link and submitted status
        const { error: checklistError } = await supabase
          .from('onboarding_checklists')
          .update({
            document_id: newDocument.id,
            status: ONBOARDING_STATUSES.SUBMITTED,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', checklist_item_id)
          .eq('employee_id', employee_id);  // ensure checklist belongs to employee

        if (checklistError) {
          logger.error('Failed to update checklist item:', checklistError);
        } else {
          logger.info(`Checklist item ${checklist_item_id} updated with document ${newDocument.id}`);
        }
      } catch (checklistUpdateError) {
        logger.error('Error updating checklist:', checklistUpdateError);
      }
    }

    // log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'documents',
      record_id: newDocument.id,
      new_values: newDocument,
      timestamp: new Date().toISOString()
    });

    logger.info(`Document uploaded: ${document_name} for employee ${employee.employee_id} by yser ${userId}`);

    return newDocument;

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
      signedUrl: signedUrlData.signedUrl
    };

  } catch (error) {
    logger.error(`Error downloading document ${documentId}:`, error);
    throw error;
  }
};

// delete a document
export const deleteDocument = async (documentId, userId) => {
  try {
    // fetch existing document
    const document = await getDocumentById(documentId);

    // delete file from storage
    const { error: storageError } = await supabase.storage
      .from(process.env.STORAGE_BUCKET_DOCUMENTS)
      .remove([document.file_path]);

    if (storageError) {
      logger.error('Document deletion error:', storageError);
      throw new InternalServerError('Failed to delete file from supabase storage: ' + storageError.message);
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
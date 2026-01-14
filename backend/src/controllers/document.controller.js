import * as documentsService from '../services/document.service.js';
import { ONBOARDING_STATUSES, ROLES } from '../config/constants.js';
import { supabase } from '../config/supabase.js';
import { ForbiddenError } from '../utils/errors.js';

// upload document controller
export const uploadDocument = async (req, res, next) => {
  try {
    const { employee_id, document_name } = req.body;
    const file = req.file;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userEmployeeDbId = req.user.employee_db_id;
    const checklistItemId = req.body.checklist_item_id;

    // employee can only upload their own documents
    if (userRole == ROLES.EMPLOYEE && String(userEmployeeDbId ?? '') !== String(employee_id ?? '')) {
      throw new ForbiddenError('You can only upload documents for yourself');
    }

    // Once a checklist item is approved, employees must not replace it.
    if (userRole === ROLES.EMPLOYEE && checklistItemId) {
      const { data: checklistRow, error: checklistErr } = await supabase
        .from('onboarding_checklists')
        .select('id, status')
        .eq('id', checklistItemId)
        .eq('employee_id', employee_id)
        .maybeSingle();

      if (checklistErr) throw new Error(checklistErr.message);

      if (checklistRow && String(checklistRow.status || '').toLowerCase() === ONBOARDING_STATUSES.APPROVED) {
        throw new ForbiddenError('This document is already approved and cannot be changed.');
      }
    }

    // prepare file data
    const fileData = {
      employee_id,
      document_name,
      checklist_item_id: checklistItemId,
      file: file.buffer,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size
    };

    const newDocument = await documentsService.uploadDocument(fileData, userId);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: newDocument
    });

  } catch (error) {
    next(error);
  }
};

// get documents by employee controller
export const getDocumentsByEmployee = async (req, res, next) => {
  try {
    const { employee_id } = req.params;
    const userRole = req.user.role;
    const userEmployeeDbId = req.user.employee_db_id;

    // employee can only view their own documents
    if (userRole === ROLES.EMPLOYEE && String(userEmployeeDbId ?? '') !== String(employee_id ?? '')) {
      throw new ForbiddenError('You can only view your own documents');
    }

    const documents = await documentsService.getDocumentsByEmployee(employee_id);

    res.status(200).json({
      success: true,
      message: 'Documents retrieved successfully',
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

// download document controller
export const downloadDocument = async (req, res, next) => {
  try {
    const { document_id } = req.params;
    const dispositionRaw = String(req.query?.disposition || '').trim().toLowerCase();
    const disposition = dispositionRaw === 'inline' ? 'inline' : 'attachment';
    const userRole = req.user.role;
    const userEmployeeDbId = req.user.employee_db_id;

    // employees can only download their own documents
    if (userRole === ROLES.EMPLOYEE) {
      const meta = await documentsService.getDocumentById(document_id);
      if (!meta || String(meta.employee_id) !== String(userEmployeeDbId ?? '')) {
        throw new ForbiddenError('You can only download your own documents');
      }
    }

    const result = await documentsService.downloadDocument(document_id);

    if (result?.provider === 'google_drive') {
      const streamed = await documentsService.streamDriveDocument(document_id);

      res.setHeader('Content-Type', streamed.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${streamed.fileName || 'document'}"`);
      return streamed.stream.pipe(res);
    }

    res.status(200).json({
      success: true,
      message: 'Document download URL generated succesfully',
      data: result
    })
  } catch (error) {
    next(error);
  }
};

// preview document controller (returns a preview URL)
export const previewDocument = async (req, res, next) => {
  try {
    const { document_id } = req.params;
    const userRole = req.user.role;
    const userEmployeeDbId = req.user.employee_db_id;

    // employees can only preview their own documents
    if (userRole === ROLES.EMPLOYEE) {
      const meta = await documentsService.getDocumentById(document_id);
      if (!meta || String(meta.employee_id) !== String(userEmployeeDbId ?? '')) {
        throw new ForbiddenError('You can only preview your own documents');
      }
    }

    const result = await documentsService.previewDocument(document_id);

    // For Drive-backed docs, Drive webViewLink requires the viewer to have Drive permissions.
    // Instead, point the UI to our authenticated inline stream endpoint.
    if (result?.provider === 'google_drive') {
      const origin = `${req.protocol}://${req.get('host')}`;
      result.url = `${origin}${req.baseUrl}/${document_id}/download?disposition=inline`;
    }

    res.status(200).json({
      success: true,
      message: 'Preview URL generated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// delete document
export const deleteDocument = async (req, res, next) => {
  try {
    const { document_id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userEmployeeDbId = req.user.employee_db_id;

    // employees can only delete their own documents
    if (userRole === ROLES.EMPLOYEE) {
      const meta = await documentsService.getDocumentById(document_id);
      if (!meta || String(meta.employee_id) !== String(userEmployeeDbId ?? '')) {
        throw new ForbiddenError('You can only delete your own documents');
      }

      // If the document is linked to an approved onboarding checklist, employees cannot delete it.
      const { data: linkedChecklist, error: linkErr } = await supabase
        .from('onboarding_checklists')
        .select('id, status')
        .eq('employee_id', userEmployeeDbId)
        .eq('document_id', document_id)
        .maybeSingle();
      if (linkErr) throw new Error(linkErr.message);

      if (linkedChecklist && String(linkedChecklist.status || '').toLowerCase() === ONBOARDING_STATUSES.APPROVED) {
        throw new ForbiddenError('Approved documents cannot be deleted.');
      }
    }

    const deletedDocument = await documentsService.deleteDocument(document_id, userId);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
      data: deletedDocument
    });
  } catch (error) {
    next(error);
  }
};
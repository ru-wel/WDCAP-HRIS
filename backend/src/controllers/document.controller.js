import * as documentsService from '../services/document.service.js';
import { ROLES } from '../config/constants.js';
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

    // employee can only upload their own documents (compare database IDs)
    if (userRole == ROLES.EMPLOYEE && userEmployeeDbId !== employee_id) {
      throw new ForbiddenError('You can only upload documents for yourself');
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

    // employee can only view their own documents (compare database IDs)
    if (userRole === ROLES.EMPLOYEE && userEmployeeDbId !== employee_id) {
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
    const userRole = req.user.role;

    // only HR/Executive can download documents
    if (userRole === ROLES.EMPLOYEE || userRole === ROLES.MANAGER) {
      throw new ForbiddenError('You do not have permission to download documents');
    }

    const result = await documentsService.downloadDocument(document_id);

    res.status(200).json({
      success: true,
      message: 'Document download URL generated succesfully',
      data: result
    })
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

    // only HR/Executive can delete documents
    if (userRole === ROLES.EMPLOYEE || userRole === ROLES.MANAGER) {
      throw new ForbiddenError('You do not have permission to delete documents');
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
import Joi from 'joi';
import { DOCUMENT_TYPES } from '../config/constants.js';

const validDocumentTypes = Object.values(DOCUMENT_TYPES);

// UPLOAD DOCUMENT VALIDATION
export const uploadDocumentSchema = Joi.object({
  employee_id: Joi.string().uuid().required().messages({
    'string.guid': 'Employee ID must be a valid UUID',
    'any.required': 'Employee ID is required'
  }),
  document_name: Joi.string().valid(...validDocumentTypes).required().messages({
    'any.only': `Document name must be one of: ${validDocumentTypes.join(', ')}`,
    'any.required': 'Document name is required'
  }),
  checklist_item_id: Joi.string().uuid().optional().messages({
    'string.guid': 'Checklist item ID must be a valid UUID'
  }),
  auto_approve: Joi.boolean().optional().messages({
    'boolean.base': 'Auto approve must be a boolean'
  })
});

// GET DOCUMENTS BY EMPLOYEE VALIDATION
export const getDocumentsByEmployeeSchema = Joi.object({
  employee_id: Joi.string().uuid().required().messages({
    'string.guid': 'Employee ID must be a valid UUID',
    'any.required': 'Employee ID is required'
  })
});

// DOCUMENT ID VALIDATION
export const documentIdSchema = Joi.object({
  document_id: Joi.string().uuid().required().messages({
    'string.guid': 'Document ID must be a valid UUID',
    'any.required': 'Document ID is required'
  })
});
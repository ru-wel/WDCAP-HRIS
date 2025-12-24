import Joi from 'joi';
import { ONBOARDING_STATUSES } from '../config/constants.js';

// schema for updating a checklist item (HR overrides requirements or adds remarks)
export const updateChecklistItemSchema = Joi.object({
  is_required: Joi.boolean(),

  status: Joi.string().valid(...Object.values(ONBOARDING_STATUSES)).messages({
    'any.only': 'Status must be one of: pending, submitted, approved, rejected'
  }),

  remarks: Joi.string().max(500).allow(null, '').messages({
    'string.max': 'Remarks cannot exceed 500 characters'
  })
}).min(1);

// schema for submitting a document
export const submitDocumentSchema = Joi.object({
  document_id: Joi.string().uuid().required().messages({
    'string.guid': 'Document ID must be a valid UUID',
    'any.required': 'Document ID is required'
  })
});


// schema for reviewing submission (HR approves/rejects)
export const reviewSubmissionSchema = Joi.object({
  status: Joi.string().valid(ONBOARDING_STATUSES.APPROVED, ONBOARDING_STATUSES.REJECTED).required().messages({
    'any.only': 'Status must be either approved or rejected',
    'any.required': 'Status is required'
  }),

  remarks: Joi.string().max(500).allow(null, '').messages({
    'string.max': 'Remarks cannot exceed 500 characters'
  })
});
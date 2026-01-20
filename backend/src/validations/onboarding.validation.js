import Joi from 'joi';
import { ONBOARDING_STATUSES, ROLES, EMPLOYMENT_STATUSES, PERSONNEL_TYPES } from '../config/constants.js';

const normalizePhMobile = (input) => {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('09') && digits.length === 11) return digits;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  if (digits.startsWith('63') && digits.length === 12 && digits[2] === '9') return `0${digits.slice(2)}`;
  return null;
};

const phMobileSchema = (label) => Joi.string()
  .trim()
  .pattern(/^\d{10,12}$/)
  .custom((value, helpers) => {
    const normalized = normalizePhMobile(value);
    if (!normalized || !/^09\d{9}$/.test(normalized)) {
      return helpers.error('any.invalid');
    }
    return normalized;
  }, `${label} normalization`)
  .required()
  .messages({
    'string.pattern.base': `${label} must be digits only`,
    'any.invalid': `${label} must be a valid PH mobile (09xxxxxxxxx, 9xxxxxxxxx, or 639xxxxxxxxx)`,
    'any.required': `${label} is required`,
  });

const personNameSchema = (label) => Joi.string()
  .trim()
  .min(1)
  .max(80)
  .pattern(/^[\p{L}][\p{L} .'-]*$/u)
  .required()
  .messages({
    'string.min': `${label} is required`,
    'string.max': `${label} is too long`,
    'string.pattern.base': `${label} contains invalid characters`,
    'any.required': `${label} is required`,
  });

export const createEmployeeWithAccountSchema = Joi.object({
  // account info
  email: Joi.string()
    .email()
    .when('personnel_type', {
      is: PERSONNEL_TYPES.PROJECT_BASED,
      then: Joi.string().email().allow('', null).optional().messages({
        'string.email': 'Please provide a valid email address'
      }),
      otherwise: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
    }),
  // Password is auto-assigned by the system after employee_id is generated.
  // We accept it for backward compatibility but do not require it.
  password: Joi.string().trim().allow('', null).optional(),
  role: Joi.string().valid(ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE).default(ROLES.EMPLOYEE).messages({
    'any.only': 'Role must be Executive, HR, Manager, or Employee'
  }),

  // employee info
  first_name: personNameSchema('First name'),
  middle_name: Joi.string().trim().allow('', null),
  last_name: personNameSchema('Last name'),
  birth_date: Joi.date().iso().required().messages({
    'date.format': 'Birth date must be a valid date',
    'any.required': 'Birth date is required'
  }),
  phone_number: phMobileSchema('Phone number'),
  address: Joi.string().trim().min(5).max(250).required().messages({
    'string.min': 'Address is too short',
    'string.max': 'Address is too long',
    'any.required': 'Address is required'
  }),
  emergency_contact_name: personNameSchema('Emergency contact name'),
  emergency_contact_number: phMobileSchema('Emergency contact number'),
  hire_date: Joi.date().iso().required().messages({
    'date.format': 'Hire date must be a valid date',
    'any.required': 'Hire date is required'
  }),
  position_id: Joi.string().uuid().required().messages({
    'string.guid': 'Position is invalid',
    'any.required': 'Position is required'
  }),
  department_id: Joi.string().uuid().required().messages({
    'string.guid': 'Department is invalid',
    'any.required': 'Department is required'
  }),
  employment_status: Joi.string().valid(EMPLOYMENT_STATUSES.ACTIVE, EMPLOYMENT_STATUSES.INACTIVE).required().messages({
    'any.only': 'Employment status must be either Active or Inactive',
    'any.required': 'Employment status is required'
  }),
  personnel_type: Joi.string().valid(PERSONNEL_TYPES.REGULAR, PERSONNEL_TYPES.PROBATIONARY, PERSONNEL_TYPES.PROJECT_BASED).required().messages({
    'any.only': 'Personnel type is invalid',
    'any.required': 'Personnel type is required'
  })
}).custom((value, helpers) => {
  const now = new Date();
  const birth = value?.birth_date instanceof Date ? value.birth_date : new Date(value?.birth_date);
  const hire = value?.hire_date instanceof Date ? value.hire_date : new Date(value?.hire_date);

  if (Number.isNaN(birth.getTime())) return helpers.error('any.invalid', { message: 'Birth date must be a valid date' });
  if (Number.isNaN(hire.getTime())) return helpers.error('any.invalid', { message: 'Hire date must be a valid date' });
  if (birth.getTime() > now.getTime()) return helpers.message('Birth date cannot be in the future');
  if (hire.getTime() > now.getTime()) return helpers.message('Hire date cannot be in the future');

  const ageYears = (() => {
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
    return years;
  })();

  if (ageYears < 18) return helpers.message('Employee must be at least 18 years old');
  if (hire.getTime() < birth.getTime()) return helpers.message('Hire date cannot be before birth date');

  const ageAtHire = (() => {
    let years = hire.getFullYear() - birth.getFullYear();
    const m = hire.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && hire.getDate() < birth.getDate())) years -= 1;
    return years;
  })();

  if (ageAtHire < 18) return helpers.message('Hire date must be on/after the employee turns 18');
  return value;
});

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
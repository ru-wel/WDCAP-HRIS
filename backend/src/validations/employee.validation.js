import Joi from 'joi';
import { EMPLOYMENT_STATUSES, PERSONNEL_TYPES, EMPLOYEE_SEX } from '../config/constants.js';

const notInFuture = (label) => Joi.date().custom((value, helpers) => {
  const pad2 = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  if (value.toISOString().slice(0, 10) > todayStr) {
    return helpers.message(`${label} cannot be in the future`);
  }
  return value;
}).messages({ 'date.base': `${label} must be a valid date` });

// EMPLOYEE VALIDATION
export const createEmployeeSchema = Joi.object({
  user_id: Joi.string().uuid().required().messages({
    'string.guid': 'User ID must be a valid UUID',
    'any.required': 'User ID is required'
  }),
  first_name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters',
    'any.required': 'First name is required'
  }),
  middle_name: Joi.string().max(50).allow('', null).messages({
    'string.max': 'Middle name cannot exceed 50 characters'
  }),
  last_name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters',
    'any.required': 'Last name is required'
  }),
  birth_date: notInFuture('Birth date').required().messages({
    'any.required': 'Birth date is required'
  }),
  phone_number: Joi.string().pattern(/^09\d{9}$/).required().messages({
    'string.pattern.base': 'Phone number must be in the format 09XXXXXXXXX (11 digits starting with 09)',
    'any.required': 'Phone number is required'
  }),
  address: Joi.string().min(5).max(255).required().messages({
    'string.min': 'Address must be at least 5 characters long',
    'string.max': 'Address cannot exceed 255 characters',
    'any.required': 'Address is required'
  }),
  emergency_contact_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Emergency contact name must be at least 2 characters long',
    'string.max': 'Emergency contact name cannot exceed 100 characters',
    'any.required': 'Emergency contact name is required'
  }),
  emergency_contact_number: Joi.string().pattern(/^09\d{9}$/).required().messages({
    'string.pattern.base': 'Emergency contact number must be in the format 09XXXXXXXXX (11 digits starting with 09)',
    'any.required': 'Emergency contact number is required'
  }),
  hire_date: notInFuture('Hire date').required().messages({
    'any.required': 'Hire date is required'
  }),
  position_id: Joi.string().uuid().required().messages({
    'string.guid': 'Position ID must be a valid UUID',
    'any.required': 'Position ID is required'
  }),
  department_id: Joi.string().uuid().required().messages({
    'string.guid': 'Department ID must be a valid UUID',
    'any.required': 'Department ID is required'
  }),
  employment_status: Joi.string().valid(EMPLOYMENT_STATUSES.ACTIVE, EMPLOYMENT_STATUSES.INACTIVE).required().messages({
    'any.only': 'Employment status must be either Active or Inactive',
    'any.required': 'Employment status is required'
  }),
  personnel_type: Joi.string().valid(PERSONNEL_TYPES.REGULAR, PERSONNEL_TYPES.PROJECT_BASED, PERSONNEL_TYPES.PROBATIONARY).required().messages({
    'any.only': 'Personnel type must be Regular, Project-Based, or Probationary',
    'any.required': 'Personnel type is required'
  })
});

export const updateEmployeeSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  middle_name: Joi.string().max(50).allow('', null).messages({
    'string.max': 'Middle name cannot exceed 50 characters'
  }),
  last_name: Joi.string().min(2).max(50).messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  birth_date: notInFuture('Birth date'),
  phone_number: Joi.string().pattern(/^09\d{9}$/).messages({
    'string.pattern.base': 'Phone number must be in the format 09XXXXXXXXX (11 digits starting with 09)'
  }),
  address: Joi.string().min(5).max(255).messages({
    'string.min': 'Address must be at least 5 characters long',
    'string.max': 'Address cannot exceed 255 characters'
  }),
  emergency_contact_name: Joi.string().min(2).max(100).messages({
    'string.min': 'Emergency contact name must be at least 2 characters long',
    'string.max': 'Emergency contact name cannot exceed 100 characters'
  }),
  emergency_contact_number: Joi.string().pattern(/^09\d{9}$/).messages({
    'string.pattern.base': 'Emergency contact number must be in the format 09XXXXXXXXX (11 digits starting with 09)'
  }),
  hire_date: notInFuture('Hire date'),
  position_id: Joi.string().uuid().messages({
    'string.guid': 'Position ID must be a valid UUID'
  }),
  department_id: Joi.string().uuid().messages({
    'string.guid': 'Department ID must be a valid UUID'
  }),
  sex: Joi.string().valid(EMPLOYEE_SEX.MALE, EMPLOYEE_SEX.FEMALE).required().messages({
    'any.only': 'Sex must be Male or Female',
    'any.required': 'Sex is required'
  }),
  employment_status: Joi.string().valid(EMPLOYMENT_STATUSES.ACTIVE, EMPLOYMENT_STATUSES.INACTIVE).messages({
    'any.only': 'Employment status must be either Active or Inactive'
  }),
  personnel_type: Joi.string().valid(PERSONNEL_TYPES.REGULAR, PERSONNEL_TYPES.PROJECT_BASED, PERSONNEL_TYPES.PROBATIONARY).messages({
    'any.only': 'Personnel type must be Regular, Project-Based, or Probationary'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
}); // at least one field must be provided for update

export const employeeIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid employee ID format',
    'any.required': 'Employee ID is required'
  })
});

export const regularizeEmployeeSchema = Joi.object({
  employee_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid employee ID format',
    'any.required': 'Employee ID is required'
  }),
  regularization_date: Joi.string().isoDate().required().messages({
    'string.isoDate': 'Regularization date must be a valid ISO date (YYYY-MM-DD)',
    'any.required': 'Regularization date is required'
  })
});
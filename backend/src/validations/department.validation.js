import Joi from 'joi';

// DEPARTMENT VALIDATION
export const createDepartmentSchema = Joi.object({
  department_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Department name must be at least 2 characters long',
    'string.max': 'Department name cannot exceed 100 characters',
    'any.required': 'Department name is required'
  }),
});

export const updateDepartmentSchema = Joi.object({
  department_name: Joi.string().min(2).max(100).messages({
    'string.min': 'Department name must be at least 2 characters long',
    'string.max': 'Department name cannot exceed 100 characters'
  }),
});

export const departmentIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid department ID format',
    'any.required': 'Department ID is required'
  }),
});
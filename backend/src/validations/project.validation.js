import Joi from "joi";
import { PROJECT_STATUSES, ASSIGNMENT_STATUSES } from "../config/constants.js";

// PROJECT VALIDATION
export const createProjectSchema = Joi.object({
  project_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Project name must be at least 2 characters long',
    'string.max': 'Project name cannot exceed 100 characters',
    'any.required': 'Project name is required'
  }),
  site_location: Joi.string().min(3).max(255).required().messages({
    'string.min': 'Site location must be at least 3 characters long',
    'string.max': 'Site location cannot exceed 255 characters',
    'any.required': 'Site location is required'
  }),
  start_date: Joi.date().required.messages({
    'date.base': 'Start date must be a valid date',
    'any.required': 'Start date is required'
  }),
  end_date: Joi.date().greater(Joi.ref('start_date')).required().messages({
    'date.base': 'End date must be a valid date',
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  status: Joi.string().valid(PROJECT_STATUSES.ACTIVE, PROJECT_STATUSES.COMPLETED, PROJECT_STATUSES.ON_HOLD, PROJECT_STATUSES.CANCELLED).required().messages({
    'any.only': 'Status must be Active, Completed, On Hold, or Cancelled',
    'any.required': 'Status is required'
  }),
  completed_at: Joi.date().allow(null).messages({
    'date.base': 'Completed at must be a valid date'
  })
});

export const updateProjectSchema = Joi.object({
  project_name: Joi.string().min(2).max(100).messages({
    'string.min': 'Project name must be at least 2 characters long',
    'string.max': 'Project name cannot exceed 100 characters'
  }),
  site_location: Joi.string().min(3).max(255).messages({
    'string.min': 'Site location must be at least 3 characters long',
    'string.max': 'Site location cannot exceed 255 charaters'
  }),
  start_date: Joi.date().messages({
    'date.base': 'Start date must be a valid date'
  }),
  end_date: Joi.date().when('start_date', { // if else to check if merong start_date
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('start_date')).messages({
      'date.greater': 'End date must be after start date'
    }),
    otherwise: Joi.date()
  }).messages({
    'date.base': 'End date must be a valid ate'
  }),
  status: Joi.string().valid(PROJECT_STATUSES.ACTIVE, PROJECT_STATUSES.COMPLETED, PROJECT_STATUSES.ON_HOLD, PROJECT_STATUSES.CANCELLED).required().messages({
    'any.only': 'Status must be Active, Completed, On Hold, or Cancelled'
  }),
  completed_at: Joi.date().allow(null).messages({
    'date.base': 'Completed at must be a valid date'
  })
}).min(1).messages({'object.min': 'At least one field must be provided for update'
});

export const projectIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid project ID format',
    'any.required': 'Project ID is required'
  })
});

// PROJECT ASSIGNMENT VALIDATION
export const createAssignmentSchema = Joi.object({
  employee_id: Joi.string().uuid().required().messages({
    'string.guid': 'Employee ID must be a valid UUID',
    'any.required': 'Employee ID is required'
  }),
  project_id: Joi.string().uuid().required().messages({
    'string.guid': 'Project ID must be a valid UUID',
    'any.required': 'Project ID is required'
  }),
  assignment_date: Joi.date().default(() => new Date()).messages({ // by default is set to today if walang naka set
    'date.base': 'Assignment date must be a valid date'
  }),
  end_date: Joi.date().greater(Joi.ref('assignment_date')).allow(null).messages({
    'date.base': 'End date must be a valid date',
    'date.greater': 'End date must be after assignment date'
  }),
  status: Joi.string().valid(ASSIGNMENT_STATUSES.ACTIVE, ASSIGNMENT_STATUSES.COMPLETED).required().messages({
    'any.only': 'Status must be Active or Completed',
    'any.required': 'Status is required'
  }),
  notes: Joi.string().max(500).allow('', null).messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

export const updateAssignmentSchema = Joi.object({
employee_id: Joi.string().uuid().required().messages({
    'string.guid': 'Employee ID must be a valid UUID'
  }),
  project_id: Joi.string().uuid().required().messages({
    'string.guid': 'Project ID must be a valid UUID'
  }),
  assignment_date: Joi.date().messages({ 
    'date.base': 'Assignment date must be a valid date'
  }),
  end_date: Joi.date().when('assignment_date', { // if else to check if merong assignment_date
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('assignment_date')).messages({
      'date.greater': 'End date must be after assignment date'
    }),
    otherwise: Joi.date().allow(null)
  }).messages({
    'date.base': 'End date must be a valid ate'
  }),
  status: Joi.string().valid(ASSIGNMENT_STATUSES.ACTIVE, ASSIGNMENT_STATUSES.COMPLETED).required().messages({
    'any.only': 'Status must be Active or Completed'
  }),
  notes: Joi.string().max(500).allow('', null).messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
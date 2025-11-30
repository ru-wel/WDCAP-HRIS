import Joi from "joi";
import { ASSIGNMENT_STATUSES } from "../config/constants.js";
import { employeeIdSchema } from "./employee.validation.js";
import { projectIdSchema } from "./project.validation.js";

// CREATE ASSIGNMENT
export const createAssignmentSchema = Joi.object({
  employee_id: employeeIdSchema.extract('id'), // reuse employee UUID validation
  project_id: projectIdSchema.extract('id'),   // reuse project UUID validation
  assignment_date: Joi.date().default(() => new Date()).messages({
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

// UPDATE ASSIGNMENT
export const updateAssignmentSchema = Joi.object({
  employee_id: employeeIdSchema.extract('id'),
  project_id: projectIdSchema.extract('id'),
  assignment_date: Joi.date().messages({
    'date.base': 'Assignment date must be a valid date'
  }),
  end_date: Joi.date().when('assignment_date', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('assignment_date')).messages({
      'date.greater': 'End date must be after assignment date'
    }),
    otherwise: Joi.date().allow(null)
  }).messages({
    'date.base': 'End date must be a valid date'
  }),
  status: Joi.string().valid(ASSIGNMENT_STATUSES.ACTIVE, ASSIGNMENT_STATUSES.COMPLETED).messages({
    'any.only': 'Status must be Active or Completed'
  }),
  notes: Joi.string().max(500).allow('', null).messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// ASSIGNMENT ID VALIDATION
export const assignmentIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid assignment ID format',
    'any.required': 'Assignment ID is required'
  })
});

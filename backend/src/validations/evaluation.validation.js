import Joi from 'joi';

const uuid = () => Joi.string().uuid();

export const evaluationIdParamSchema = Joi.object({
  evaluation_id: uuid().required().messages({
    'string.guid': 'Evaluation ID must be a valid UUID',
    'any.required': 'Evaluation ID is required'
  })
});

export const employeeIdParamSchema = Joi.object({
  employee_id: uuid().required().messages({
    'string.guid': 'Employee ID must be a valid UUID',
    'any.required': 'Employee ID is required'
  })
});

export const listEvaluationsSchema = Joi.object({
  employee_id: uuid().optional(),
  from: Joi.string().isoDate().optional(),
  to: Joi.string().isoDate().optional()
});

export const summaryQuerySchema = Joi.object({
  include_inactive: Joi.boolean().truthy('true').falsy('false').optional(),
});

export const createScheduleSchema = Joi.object({
  employee_id: uuid().required(),
  evaluation_type: Joi.string().trim().max(80).required(),
  evaluation_date: Joi.string().isoDate().required(),
  evaluation_notes: Joi.string().allow('', null).max(2000).optional()
});

export const updateScheduleSchema = Joi.object({
  evaluation_id: uuid().required(),
  evaluation_date: Joi.string().isoDate().required(),
  evaluation_type: Joi.string().trim().max(80).optional()
});

export const submitEvaluationSchema = Joi.object({
  evaluation_id: uuid().required(),
  score: Joi.alternatives().try(Joi.number().min(0).max(100), Joi.string().trim().allow('', null)).optional(),
  remarks: Joi.string().allow('', null).max(2000).optional(),
  evaluation_type: Joi.string().trim().max(80).optional(),
  evaluation_form: Joi.alternatives().try(
    Joi.string().allow('', null),
    Joi.object().unknown(true)
  ).optional(),
  template_id: uuid().allow('', null).optional()
});

export const downloadSchema = Joi.object({
  evaluation_id: uuid().required(),
  doc: Joi.string().valid('file', 'breakdown', 'final', 'form').optional(),
  disposition: Joi.string().valid('inline', 'attachment').optional()
});

export const pendingDueSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).required(),
  quarter: Joi.number().integer().min(1).max(4).required()
});

export const ensureScheduleSchema = Joi.object({
  employee_id: uuid().required(),
  evaluation_type: Joi.string().trim().max(80).required(),
  evaluation_date: Joi.string().isoDate().required(),
});

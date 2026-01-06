import Joi from 'joi';

const STATUS_VALUES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

export const listLeaveRequestsSchema = Joi.object({
  status: Joi.string().valid(...STATUS_VALUES).optional().messages({
    'any.only': `Status must be one of: ${STATUS_VALUES.join(', ')}`
  })
});

export const listMyLeaveRequestsSchema = listLeaveRequestsSchema;

export const createLeaveRequestSchema = Joi.object({
  leave_type_id: Joi.alternatives().try(Joi.string().uuid(), Joi.number().integer()).required().messages({
    'any.required': 'Leave type is required'
  }),
  start_date: Joi.date().required().messages({
    'date.base': 'Start date must be a valid date',
    'any.required': 'Start date is required'
  }),
  end_date: Joi.date().min(Joi.ref('start_date')).required().messages({
    'date.base': 'End date must be a valid date',
    'date.min': 'End date must be the same as or after start date',
    'any.required': 'End date is required'
  }),
  reason: Joi.string().max(500).allow('', null).messages({
    'string.max': 'Reason cannot exceed 500 characters'
  })
});

export const updateLeaveRequestStatusSchema = Joi.object({
  status: Joi.string().valid(...STATUS_VALUES).required().messages({
    'any.only': `Status must be one of: ${STATUS_VALUES.join(', ')}`,
    'any.required': 'Status is required'
  }),
  reason: Joi.string().max(500).allow('', null).messages({
    'string.max': 'Reason cannot exceed 500 characters'
  })
});

export const listLeaveHistorySchema = Joi.object({
  employee_id: Joi.string().optional()
});

export const listMyLeaveHistorySchema = Joi.object({});

export const cancelLeaveRequestSchema = Joi.object({
  leave_request_id: Joi.alternatives().try(Joi.string(), Joi.number()).required()
});

export const listLeaveCreditsSchema = Joi.object({
  year: Joi.number().integer().min(2000).max(2100).optional().messages({
    'number.base': 'Year must be a number'
  })
});

export const listMyLeaveCreditsSchema = listLeaveCreditsSchema;

export const updateLeaveCreditSchema = Joi.object({
  leave_balance_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  current_balance: Joi.number().min(0).required().messages({
    'number.base': 'Current balance must be a number',
    'number.min': 'Current balance cannot be negative',
    'any.required': 'Current balance is required'
  }),
  carried_over: Joi.number().min(0).optional().messages({
    'number.base': 'Carried over must be a number',
    'number.min': 'Carried over cannot be negative'
  })
});

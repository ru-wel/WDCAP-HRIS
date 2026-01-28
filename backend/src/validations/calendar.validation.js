import Joi from 'joi';
import { EVENT_TYPES, CALENDAR_EVENT_TYPES } from '../config/constants.js';

// validate query parameters for fetching calendar events
export const getEventsSchema = Joi.object({
  start: Joi.date().iso().required().messages({
    'date.base': 'Start date must be a valid date',
    'date.format': 'Start date must be in ISO format (YYYY-MM-DD)',
    'any.required': 'Start date is required'
  }),
  end: Joi.date().iso().greater(Joi.ref('start')).required().messages({
    'date.base': 'End date must be a valid date',
    'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  types: Joi.array().items(
    Joi.string().valid(
      CALENDAR_EVENT_TYPES.LEAVE,
      CALENDAR_EVENT_TYPES.EVALUATION,
      CALENDAR_EVENT_TYPES.BIRTHDAY,
      CALENDAR_EVENT_TYPES.EVENT,
      CALENDAR_EVENT_TYPES.PROJECT,
      CALENDAR_EVENT_TYPES.HOLIDAY
    )
  ).messages({
    'array.base': 'Types must be an array',
    'any.only': 'Invalid event type. Must be one of: leave, evaluation, birthday, event, project, holiday'
  })
});

// validate company event creation
export const createCompanyEventSchema = Joi.object({
  title: Joi.string().min(2).max(200).required().messages({
    'string.min': 'Event title must be at least 2 characters long',
    'string.max': 'Event title cannot exceed 200 characters',
    'any.required': 'Event title is required'
  }),
  description: Joi.string().max(1000).allow('', null).messages({
    'string.max': 'Event description cannot exceed 1000 characters'
  }),
  event_date: Joi.date().iso().required().messages({
    'date.base': 'Event date must be a valid date',
    'date.format': 'Event date must be in ISO format (YYYY-MM-DD)',
    'any.required': 'Event date is required'
  }),
  end_date: Joi.date().iso().min(Joi.ref('event_date')).allow(null).messages({
    'date.base': 'End date must be a valid date',
    'date.format': 'End date must be in ISO format (YYYY-MM-DD)',
    'date.min': 'End date cannot be before event date'
  }),
  event_type: Joi.string().valid(
    EVENT_TYPES.HOLIDAY,
    EVENT_TYPES.COMPANY_EVENT,
    EVENT_TYPES.MEETING
  ).required().messages({
    'any.only': 'Event type must be one of: holiday, company_event, meeting',
    'any.required': 'Event type is required'
  }),
  is_recurring: Joi.boolean().default(false).messages({
    'boolean.base': 'is_recurring must be a boolean value'
  }),
  recurrence_pattern: Joi.string().max(100).allow('', null).when('is_recurring', {
    is: true,
    then: Joi.string().required().messages({
      'any.required': 'Recurrence pattern is required when event is recurring'
    })
  }).messages({
    'string.max': 'Recurrence pattern cannot exceed 100 characters'
  })
});

// validate company event update
export const updateCompanyEventSchema = Joi.object({
  title: Joi.string().min(2).max(200).messages({
    'string.min': 'Event title must be at least 2 characters long',
    'string.max': 'Event title cannot exceed 200 characters'
  }),
  description: Joi.string().max(1000).allow('', null).messages({
    'string.max': 'Event description cannot exceed 1000 characters'
  }),
  event_date: Joi.date().iso().messages({
    'date.base': 'Event date must be a valid date',
    'date.format': 'Event date must be in ISO format (YYYY-MM-DD)'
  }),
  end_date: Joi.date().iso().when('event_date', {
    is: Joi.exist(),
    then: Joi.date().min(Joi.ref('event_date')).messages({
      'date.min': 'End date cannot be before event date'
    }),
    otherwise: Joi.date().allow(null)
  }).messages({
    'date.base': 'End date must be a valid date',
    'date.format': 'End date must be in ISO format (YYYY-MM-DD)'
  }),
  event_type: Joi.string().valid(
    EVENT_TYPES.HOLIDAY,
    EVENT_TYPES.COMPANY_EVENT,
    EVENT_TYPES.MEETING
  ).messages({
    'any.only': 'Event type must be one of: holiday, company_event, meeting'
  }),
  is_recurring: Joi.boolean().messages({
    'boolean.base': 'is_recurring must be a boolean value'
  }),
  recurrence_pattern: Joi.string().max(100).allow('', null).when('is_recurring', {
    is: true,
    then: Joi.string().required().messages({
      'any.required': 'Recurrence pattern is required when event is recurring'
    })
  }).messages({
    'string.max': 'Recurrence pattern cannot exceed 100 characters'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// validate event ID parameter
export const eventIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid event ID format',
    'any.required': 'Event ID is required'
  })
});

// validate leave request ID parameter
export const leaveIdSchema = Joi.object({
  leaveId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid leave request ID format',
    'any.required': 'Leave request ID is required'
  })
});

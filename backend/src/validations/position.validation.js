import Joi from 'joi';

// POSITION VALIDATION
export const createPositionSchema = Joi.object({
  position_title: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Position title must be at least 2 characters long',
    'string.max': 'Position title cannot exceed 100 characters',
    'any.required': 'Position title is required'
  })
});

export const updatePositionSchema = Joi.object({
  position_title: Joi.string().min(2).max(100).messages({
    'string.min': 'Position name must be at least 2 characters long',
    'string.max': 'Position name cannot exceed 100 characters'
  })
});

export const positionIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid position ID format',
    'any.required': 'Position ID is required'
  })
});
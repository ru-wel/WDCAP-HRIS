import Joi from 'joi';

// schema for new onboarding item
export const createOnboardingItemSchema = Joi.object({
  item_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Item name must be at least 2 characters',
    'string.max': 'Item name cannot exceed 100 characters',
    'any.required': 'Item name is required'
  }),
  is_required_by_default: Joi.boolean().required().messages({
    'any.required': 'is_required_by_default is required'
  }),
  display_order: Joi.number().integer().min(0).required().messages({
    'number.min': 'Display order must be 0 or greater',
    'any.required': 'Display order is required'
  })
});

export const updateOnboardingItemSchema = Joi.object({
  item_name: Joi.string().min(2).max(100).messages({
    'string.min': 'Item name must be at least 2 characters',
    'string.max': 'Item name cannot exceed 100 characters'
  }),
  is_required_by_default: Joi.boolean(),
  display_order: Joi.number().integer().min(0).messages({
    'number.min': 'Display order must be 0 or greater'
  })
}).min(1);
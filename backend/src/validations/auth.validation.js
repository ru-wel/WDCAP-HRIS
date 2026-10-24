import Joi from 'joi';
import { ROLES } from '../config/constants.js';

// LOGIN VALIDATION
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({'string.email': 'Please provide a valid email address', 'any.required': 'Email is required'}),
  // Do not enforce password policy on login; Auth will validate credentials.
  // This avoids blocking older accounts and keeps error messaging consistent.
  password: Joi.string().required().messages({ 'any.required': 'Password is required' }),
  // reCAPTCHA disabled, see auth.controller.js login()
  // captchaToken: Joi.string().required().messages({'any.required': 'Captcha token is required'})
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({'string.email': 'Please provide a valid email address', 'any.required': 'Email is required'}),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)')).required().messages({'string.min': 'Password must be at least 8 characters long', 'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number', 'any.required': 'Password is required'}),
  role: Joi.string().valid(ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE).default(ROLES.EMPLOYEE).messages({'any.only': 'Role must be Executive, HR, Manager, or Employee'})
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().min(8).required().messages({
    'string.min': 'Current password must be at least 8 characters long',
    'any.required': 'Current password is required'
  }),
  new_password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Confirm password must match the new password',
      'any.required': 'Confirm password is required'
    })
});

export const adminResetPasswordSchema = Joi.object({
  employeeId: Joi.string().trim().required().messages({
    'any.required': 'Employee ID is required'
  }),
  new_password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Confirm password must match the new password',
      'any.required': 'Confirm password is required'
    })
});

export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

export const resetPasswordSchema = Joi.object({
  access_token: Joi.string().trim().required().messages({
    'any.required': 'Reset token is required'
  }),
  new_password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Confirm password must match the new password',
      'any.required': 'Confirm password is required'
    })
});
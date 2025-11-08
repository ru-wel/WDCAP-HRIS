import Joi from 'joi';
import { ROLES } from '../config/constants.js';

// LOGIN VALIDATION
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({'string.email': 'Please provide a valid email address', 'any.required': 'Email is required'}),
  password: Joi.string().min(8).required().messages({'string.min': 'Password must be at least 8 characters long', 'any.required': 'Password is required'})
});

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({'string.email': 'Please provide a valid email address', 'any.required': 'Email is required'}),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)')).required().messages({'string.min': 'Password must be at least 8 characters long', 'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number', 'any.required': 'Password is required'}),
  role: Joi.string().valid(ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE).default(ROLES.EMPLOYEE).messages({'any.only': 'Role must be either Admin, HR, or Employee'})
});
import rateLimit from 'express-rate-limit';

// general API rate limiter for all routes

export const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,                // 100 requests per minute
  standardHeaders: true,   // return rate limit info in headers
  legacyHeaders: false,   
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// stricter rate limits for login attempts

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 5,                        // 5 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.',
    error: 'LOGIN_RATE_LIMIT_EXCEEDED'
  }
});

// rate limiter for token refresh endpoint

export const refreshLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 10,                  // 10 refresh attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many refresh attempts, please try again later.',
    error: 'REFRESH_RATE_LIMIT_EXCEEDED'
  }
});

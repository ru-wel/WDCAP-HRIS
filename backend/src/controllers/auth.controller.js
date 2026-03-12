// auth controller
import * as authService from '../services/auth.service.js';
import logger from '../utils/logger.js';
import axios from 'axios';

// register controller
export const register = async (req, res, next) => {
  try {
    // call auth service to register user
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'User account created successfully. Please complete employee profile.',
      data: result
    });
  } catch (error){
    next(error); 
  }
}

// login controller
export const login = async(req, res, next) => {
  try {
    const { captchaToken, ...loginData } = req.body || {};

    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        message: 'Captcha token is required'
      });
    }

    const secretKey = process.env.RECAPTCHA_SECRET;

    if (!secretKey) {
      return res.status(500).json({
        success: false,
        message: 'reCAPTCHA secret key is not configured'
      });
    }

    const verifyResponse = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: captchaToken
        }
      }
    );

    const { success, score, action } = verifyResponse.data || {};

    if (!success) {
      return res.status(403).json({
        success: false,
        message: 'Captcha verification failed'
      });
    }

    if (action !== 'login') {
      return res.status(403).json({
        success: false,
        message: 'Invalid captcha action'
      });
    }

    if (typeof score === 'number' && score < 0.5) {
      return res.status(403).json({
        success: false,
        message: 'Suspicious login detected. Please try again later.'
      });
    }

    const result = await authService.login(loginData);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// logout controller
export const logout = async (req, res, next) => {
  try {
    // get user from request
    const userId = req.user?.id;
    if (userId){
      // log logout action in audit_logs
      const { supabase } = await import('../config/supabase.js');
      const { AUDIT_ACTIONS } = await import('../config/constants.js');

      await supabase.from('audit_logs').insert({
        user_id: userId,
        action_type: AUDIT_ACTIONS.LOGOUT,
        table_name: 'users',
        record_id: userId,
        timestamp: new Date().toISOString()
      });

      logger.info(`User logged out: ${req.user.email}`);
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);    
  }
};

// get current user controller
export const getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      employee_id: req.user.employee_id,
      employee_db_id: req.user.employee_db_id
    });

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await authService.changePassword({
      userId: req.user.id,
      email: req.user.email,
      current_password,
      new_password
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// refresh token controller
export const refreshToken = async (req, res, next) => {
  try {
    const result = await authService.refreshToken(req.body);
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export const adminResetPassword = async (req, res, next) => {
  try {
    const actorId = req.user?.id;
    const { employeeId, new_password } = req.body;

    const result = await authService.adminResetPassword({ employeeId, new_password, actorId, requesterRole: req.user?.role });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    // Prefer explicit Origin header (browser), else infer from Referer.
    let originBaseUrl = req.get('origin') || '';
    if (!originBaseUrl) {
      try {
        const ref = req.get('referer') || '';
        if (ref) originBaseUrl = new URL(ref).origin;
      } catch {
        originBaseUrl = '';
      }
    }

    const result = await authService.requestPasswordReset({
      email,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      originBaseUrl
    });

    // Always return a generic success response.
    const payload = {
      success: true,
      message: 'If the account exists, password reset instructions have been sent.'
    };

    // Dev-only: include debug details so local testing isn't blind.
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'development') {
      payload.debug = result?.debug || null;
    }

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { access_token, new_password } = req.body || {};

    const result = await authService.resetPasswordWithToken({
      access_token,
      new_password,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Google login controller (Supabase-based)
export const googleLogin = async (req, res, next) => {
  try {
    const { googleToken } = req.body || {};

    if (!googleToken) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    const result = await authService.googleLogin({ googleToken });
    res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};


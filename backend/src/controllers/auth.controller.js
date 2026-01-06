import * as authService from '../services/auth.service.js';
import logger from '../utils/logger.js';

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
    // call auth service to login user
    const result = await authService.login(req.body);
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

    const result = await authService.adminResetPassword({ employeeId, new_password, actorId });

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

    await authService.requestPasswordReset({
      email,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Always return a generic success response.
    res.status(200).json({
      success: true,
      message: 'If the account exists, your request has been sent to Admin/HR.'
    });
  } catch (error) {
    next(error);
  }
};


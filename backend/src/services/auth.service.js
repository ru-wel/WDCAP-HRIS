import { supabase } from '../config/supabase.js';
import { UnauthorizedError, ConflictError, InternalServerError } from '../utils/errors.js';
import { ROLES, AUDIT_ACTIONS } from '../config/constants.js';
import logger from '../utils/logger.js';

// Register a new user
export const register = async ({ email, password, role = ROLES.EMPLOYEE }) => {
  try {
    // check if user already exists
    const { data: existingUser, error: checkError } = await supabase 
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (existingUser){
      throw new ConflictError('Email already registered');
    }

    // create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError){
      throw new InternalServerError('Failed to create user account');
    }

    if (!authData.user){
      throw new InternalServerError('Failed to create user account');
    }

    // insert user details into users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          role,
          employee_id: null, // Will be set when employee profile is created
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: null
        }
      ])
      .select()
      .single();
    
    if (insertError){
      // Rollback: delete the auth user if insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new InternalServerError(insertError.message);
    }

    // log registration in audit_logs
    await supabase.from('audit_logs').insert({
      user_id: newUser.id,
      action_type: AUDIT_ACTIONS.CREATE, // constant from constants.js
      table_name: 'users',
      record_id: newUser.id,
      new_values: { email, role },
      timestamp: new Date().toISOString() 
    });

    logger.info(`New user registered: ${email} with role ${role}`);

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    }

  } catch (error) {
    logger.error('Registration error:', error)
    throw error;
  }
}

// Login user
export const login = async ({ email, password }) => {
  try {
    //authenticate with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (signInError || !authData.user){
      throw new UnauthorizedError('Invalid email or password');
    }

    // get user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, employee_id')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      throw new InternalServerError('User not found in database');
    }

    // update last_login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    // log the login in audit_logs
    await supabase.from('audit_logs').insert({
      user_id: userData.id,
      action_type: AUDIT_ACTIONS.LOGIN, // constant from constants.js
      table_name: 'users',
      record_id: userData.id,
      timestamp: new Date().toISOString()
    });

    logger.info(`User logged in: ${email}`);
    return {
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        employee_id: userData.employee_id
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in
      }
    }
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
}
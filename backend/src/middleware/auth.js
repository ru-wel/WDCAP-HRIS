import { supabase } from "../config/supabase.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";

// verify JWT token and authenticate user
export const authenticate = async (req, res, next) => {
  try {
    // get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')){
      throw new UnauthorizedError('No token provided. Please login.');
    }

    // extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    if (!token){
      throw new UnauthorizedError('Invalid token format.');
    }

    // verify token with Supabase Auth
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    
    if (error || !authUser){
      throw new UnauthorizedError('Invalid or expired token. Please login again.');  
    }

    // get user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, employee_id')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData){
      throw new UnauthorizedError('User not found');
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      employee_id: userData.employee_id
    };

    next();

  } catch (error) {
    next(error);
  }
};

// check if user has required role
export const authorizeRoles = (...allowedRoles) => { // parameter for array of allowed roles
  return (req, res, next) => {
    try {
      // check if user is authenticated
      if (!req.user){
        throw new UnauthorizedError('User not authenticated');
      }
      
      // check if user's role is in allowedRoles
      if (!allowedRoles.includes(req.user.role)){
        throw new ForbiddenError('You do not have permission to access this resource');
      }

      // user has required role, continue
      next();
    } catch (error) {
      next(error);
    }
}
}
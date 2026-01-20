import { supabase } from "../config/supabase.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";
import { ROLES } from "../config/constants.js";

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

    // users.employee_id is treated as the employee code (e.g., AC-00001)
    // Some tables (documents/onboarding_checklists) use employees.id (DB PK). We resolve that as employee_db_id.
    let employeeCode = userData.employee_id;
    let employeeDbId = null;

    // Best-effort: if employee code is missing, try to resolve it from employees.user_id
    if (!employeeCode) {
      try {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, employee_id')
          .eq('user_id', userData.id)
          .maybeSingle();

        if (emp?.employee_id) {
          employeeCode = emp.employee_id;
          employeeDbId = emp.id ?? null;
          await supabase
            .from('users')
            .update({ employee_id: employeeCode, updated_at: new Date().toISOString() })
            .eq('id', userData.id);
        }
      } catch {
        // ignore; user may not have employee profile
      }
    }

    // Best-effort: resolve employees.id from employee code
    if (!employeeDbId && employeeCode) {
      try {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_id', employeeCode)
          .maybeSingle();
        employeeDbId = emp?.id ?? null;
      } catch {
        // ignore
      }
    }

    req.user = {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      employee_id: employeeCode,
      employee_db_id: employeeDbId
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

// only employee can access their own data
export const verifyEmployeeOwnership = async (req, res, next) => {
  try {
    // HR and Executive can access any employee's data
    if (req.user.role === ROLES.EXECUTIVE || req.user.role === ROLES.HR) {
      return next();
    }

    // regular employees, verify they're accessing their own data
    const { employeeId } = req.params;

    if (!req.user.employee_id) {
      throw new ForbiddenError('You do not have an associated employee profile');
    }

    if (req.user.employee_id !== employeeId) {
      throw new ForbiddenError('You can only access your own employee data');
    }

    next();

  } catch (error) {
    next(error);
  }
};

// only employee can access their own checklist data
export const verifyChecklistOwnership = async (req, res, next) => {
  try {
    // HR and Executive can access any checklist item
    if (req.user.role === ROLES.EXECUTIVE || req.user.role === ROLES.HR) {
      return next();
    }

    // for regular employees, verify the checklist item belongs to them
    const { id } = req.params;

    if (!req.user.employee_id) {
      throw new ForbiddenError('You do not have an associated employee profile');
    }

    const { data: checklistItem, error } = await supabase
      .from('onboarding_checklists')
      .select('employee_id')
      .eq('id', id)
      .single();

    if (error || !checklistItem) {
      throw new ForbiddenError('Checklist item not found');
    }

    if (checklistItem.employee_id !== req.user.employee_id) {
      throw new ForbiddenError('You can only access your own checklist items');
    }

    next();

  } catch (error) {
    next(error);
  }
};
import { supabase } from '../config/supabase.js';
import { InternalServerError, NotFoundError } from '../utils/errors.js';
import { ROLES, CALENDAR_EVENT_TYPES } from '../config/constants.js';
import logger from '../utils/logger.js';
import * as companyEventsService from './companyEvents.service.js';

export const getLeaveDetailsById = async (leaveRequestId, userId, userRole) => {
  try {
    const { data: leave, error } = await supabase
      .from('leave_requests')
      .select(`
        leave_request_id,
        employee_id,
        start_date,
        end_date,
        status,
        reason
      `)
      .eq('leave_request_id', leaveRequestId)
      .single();

    if (error) {
      throw new InternalServerError(`Failed to fetch leave details: ${error.message}`);
    }

    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }

    // employee can only see own leave
    if (userRole === ROLES.EMPLOYEE) {
      const { data: userData } = await supabase
        .from('users')
        .select('employee_id')
        .eq('id', userId)
        .single();

      if (leave.employee_id !== userData?.employee_id) {
        throw new NotFoundError('Leave request not found');
      }
    }

    return {
      id: leave.leave_request_id,
      startDate: leave.start_date,
      endDate: leave.end_date,
      status: leave.status,
      reason: leave.reason
    };

  } catch (error) {
    logger.error('Error fetching leave details:', error);
    throw error;
  }
};

export const getLeaveEvents = async (startDate, endDate, userId, userRole) => {
  try {
    let query = supabase
      .from('leave_requests')
      .select(`
        leave_request_id,
        employee_id,
        start_date,
        end_date,
        status,
        reason,
        leave_types:leave_type_id (leave_type_name),
        employees:employee_id (
          id,
          employee_id,
          first_name,
          last_name
        )
      `)
      .or(`and(start_date.gte.${startDate},start_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`)
      .in('status', ['APPROVED', 'PENDING'])
      .order('start_date', { ascending: true });

    // employee and manager see only their own leaves
    if (userRole === ROLES.EMPLOYEE || userRole === ROLES.MANAGER) {
      // get employee_id from user
      const { data: userData } = await supabase
        .from('users')
        .select('employee_id')
        .eq('id', userId)
        .single();

      if (userData?.employee_id) {
        query = query.eq('employee_id', userData.employee_id);
      }
    }

    const { data: leaves, error } = await query;

    if (error) {
      throw new InternalServerError(`Failed to fetch leave events: ${error.message}`);
    }

    return (leaves || []).map(leave => {
      const [year, month, day] = leave.end_date.split('-').map(Number);
      const endDate = new Date(year, month - 1, day);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      return {
        id: `leave-${leave.leave_request_id}`,
        title: `${leave.employees?.first_name} ${leave.employees?.last_name} - ${leave.leave_types?.leave_type_name || 'Leave'}`,
        start: leave.start_date,
        end: endDateStr,
        allDay: true,
        extendedProps: {
          type: CALENDAR_EVENT_TYPES.LEAVE,
          status: leave.status,
          employeeId: leave.employees?.id,
          employeeName: `${leave.employees?.first_name} ${leave.employees?.last_name}`,
          leaveType: leave.leave_types?.leave_type_name,
          reason: leave.reason,
          recordId: leave.leave_request_id,
          originalStartDate: leave.start_date,
          originalEndDate: leave.end_date
        }
      };
    });

  } catch (error) {
    logger.error('Error fetching leave events:', error);
    throw error;
  }
};

export const getEvaluationEvents = async (startDate, endDate, userId, userRole) => {
  try {
    let query = supabase
      .from('performance_evaluations')
      .select(`
        evaluation_id,
        employee_id,
        evaluation_type,
        evaluation_date,
        evaluation_notes,
        employees:employee_id (
          id,
          employee_id,
          first_name,
          last_name
        )
      `)
      .gte('evaluation_date', startDate)
      .lte('evaluation_date', endDate)
      .order('evaluation_date', { ascending: true });

    // employee and manager see only their own evaluations
    if (userRole === ROLES.EMPLOYEE || userRole === ROLES.MANAGER) {
      const { data: userData } = await supabase
        .from('users')
        .select('employee_id')
        .eq('id', userId)
        .single();

      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_id', userData?.employee_id)
        .single();

      if (employeeData?.id) {
        query = query.eq('employee_id', employeeData.id);
      }
    }

    const { data: evaluations, error } = await query;

    if (error) {
      throw new InternalServerError(`Failed to fetch evaluation events: ${error.message}`);
    }

    return (evaluations || []).map(evaluation => {
      const dateStr = String(evaluation.evaluation_date).split('T')[0];

      const [year, month, day] = dateStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, day);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      return {
        id: `evaluation-${evaluation.evaluation_id}`,
        title: `Evaluation: ${evaluation.employees?.first_name} ${evaluation.employees?.last_name}`,
        start: dateStr,
        end: endDateStr,
        allDay: true,
        extendedProps: {
          type: CALENDAR_EVENT_TYPES.EVALUATION,
          employeeId: evaluation.employees?.id,
          employeeName: `${evaluation.employees?.first_name} ${evaluation.employees?.last_name}`,
          evaluationType: evaluation.evaluation_type,
          notes: evaluation.evaluation_notes,
          recordId: evaluation.evaluation_id,
          originalDate: dateStr
        }
      };
    });

  } catch (error) {
    logger.error('Error fetching evaluation events:', error);
    throw error;
  }
};

export const getBirthdayEvents = async (startDate, endDate, userRole) => {
  try {
    // all roles can see birthdays (Employee, Manager, HR, Executive)
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name, birth_date')
      .eq('employment_status', 'Active')
      .not('birth_date', 'is', null);

    if (error) {
      throw new InternalServerError(`Failed to fetch birthday events: ${error.message}`);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const birthdayEvents = [];

    (employees || []).forEach(employee => {
      const [, month, day] = employee.birth_date.split('-').map(Number);
      const birthMonth = month - 1;
      const birthDay = day;

      const currentYear = start.getFullYear();
      const endYear = end.getFullYear();

      // check birthdays in the range (handle year transitions)
      for (let year = currentYear; year <= endYear; year++) {
        const birthdayThisYear = new Date(year, birthMonth, birthDay);

        if (birthdayThisYear >= start && birthdayThisYear <= end) {
          const dateStr = `${year}-${String(birthMonth + 1).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

          const nextDay = new Date(year, birthMonth, birthDay);
          nextDay.setDate(nextDay.getDate() + 1);
          const endDateStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;

          birthdayEvents.push({
            id: `birthday-${employee.id}-${year}`,
            title: `🎂 ${employee.first_name} ${employee.last_name}'s Birthday`,
            start: dateStr,
            end: endDateStr,
            allDay: true,
            extendedProps: {
              type: CALENDAR_EVENT_TYPES.BIRTHDAY,
              employeeId: employee.id,
              employeeName: `${employee.first_name} ${employee.last_name}`,
              birthDate: employee.birth_date,
              recordId: employee.id,
              originalDate: dateStr
            }
          });
        }
      }
    });

    return birthdayEvents;

  } catch (error) {
    logger.error('Error fetching birthday events:', error);
    throw error;
  }
};

export const getCompanyEventsForCalendar = async (startDate, endDate) => {
  try {
    const events = await companyEventsService.getCompanyEvents(startDate, endDate);

    return events.map(event => {
      // Ensure dates are formatted correctly without timezone conversion
      const startDateStr = String(event.event_date).split('T')[0];
      const originalEndDateStr = event.end_date ? String(event.end_date).split('T')[0] : null;

      // Handle end date: if provided, use it; otherwise add 1 day to start (for exclusive end behavior)
      let endDateStr;
      if (event.end_date) {
        // Multi-day event: add 1 day to the provided end date for FullCalendar exclusive behavior
        const [year, month, day] = String(event.end_date).split('T')[0].split('-').map(Number);
        const endDate = new Date(year, month - 1, day);
        endDate.setDate(endDate.getDate() + 1);
        endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      } else {
        // Single-day event: add 1 day to start date for FullCalendar exclusive behavior
        const [year, month, day] = startDateStr.split('-').map(Number);
        const endDate = new Date(year, month - 1, day);
        endDate.setDate(endDate.getDate() + 1);
        endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      }

      return {
        id: `company-event-${event.id}`,
        title: event.title,
        start: startDateStr,
        end: endDateStr,
        allDay: true,
        extendedProps: {
          type: event.event_type === 'holiday' ? CALENDAR_EVENT_TYPES.HOLIDAY : CALENDAR_EVENT_TYPES.EVENT,
          eventType: event.event_type,
          description: event.description,
          isRecurring: event.is_recurring,
          recurrencePattern: event.recurrence_pattern,
          recordId: event.id,
          // Store original dates for modal display
          originalDate: startDateStr,
          originalEndDate: originalEndDateStr
        }
      };
    });

  } catch (error) {
    logger.error('Error fetching company events:', error);
    throw error;
  }
};

export const getCalendarEvents = async (startDate, endDate, eventTypes, userId, userRole) => {
  try {
    const allEvents = [];
    const typesToFetch = eventTypes && eventTypes.length > 0 ? eventTypes : Object.values(CALENDAR_EVENT_TYPES);

    const fetchPromises = [];

    if (typesToFetch.includes(CALENDAR_EVENT_TYPES.LEAVE)) {
      fetchPromises.push(
        getLeaveEvents(startDate, endDate, userId, userRole)
          .catch(err => {
            logger.error('Error fetching leaves for calendar:', err);
            return [];
          })
      );
    }

    if (typesToFetch.includes(CALENDAR_EVENT_TYPES.EVALUATION)) {
      fetchPromises.push(
        getEvaluationEvents(startDate, endDate, userId, userRole)
          .catch(err => {
            logger.error('Error fetching evaluations for calendar:', err);
            return [];
          })
      );
    }

    if (typesToFetch.includes(CALENDAR_EVENT_TYPES.BIRTHDAY)) {
      fetchPromises.push(
        getBirthdayEvents(startDate, endDate, userRole)
          .catch(err => {
            logger.error('Error fetching birthdays for calendar:', err);
            return [];
          })
      );
    }

    if (typesToFetch.includes(CALENDAR_EVENT_TYPES.EVENT) || typesToFetch.includes(CALENDAR_EVENT_TYPES.HOLIDAY)) {
      fetchPromises.push(
        getCompanyEventsForCalendar(startDate, endDate)
          .catch(err => {
            logger.error('Error fetching company events for calendar:', err);
            return [];
          })
      );
    }

    const results = await Promise.all(fetchPromises);

    results.forEach(eventArray => {
      allEvents.push(...eventArray);
    });

    // sort by start date
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    logger.info(`Fetched ${allEvents.length} calendar events for user ${userId} (${startDate} to ${endDate})`);

    return allEvents;

  } catch (error) {
    logger.error('Error fetching calendar events:', error);
    throw error;
  }
};

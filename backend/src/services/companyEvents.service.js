import { supabase } from '../config/supabase.js';
import { InternalServerError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import logger from '../utils/logger.js';

export const createCompanyEvent = async (eventData, userId) => {
  try {
    const { title, description, event_date, end_date, event_type, is_recurring, recurrence_pattern } = eventData;

    // end date cannot be on a previous date
    if (end_date && new Date(end_date) < new Date(event_date)) {
      throw new BadRequestError('End date cannot be before event date');
    }

    const { data: event, error } = await supabase
      .from('company_events')
      .insert({
        title,
        description,
        event_date,
        end_date: end_date || null,
        event_type,
        is_recurring: is_recurring || false,
        recurrence_pattern: recurrence_pattern || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new InternalServerError(`Failed to create company event: ${error.message}`);
    }

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'company_events',
      record_id: event.id,
      new_values: event,
      timestamp: new Date().toISOString()
    });

    logger.info(`Company event created: ${event.title} (${event.event_type}) on ${event.event_date}`);

    return event;

  } catch (error) {
    logger.error('Error creating company event:', error);
    throw error;
  }
};

export const getCompanyEvents = async (startDate, endDate) => {
  try {
    const { data: events, error } = await supabase
      .from('company_events')
      .select('*, created_by_user:users!company_events_created_by_fkey(id, email, employee_id)')
      .or(`and(event_date.gte.${startDate},event_date.lte.${endDate}),and(end_date.gte.${startDate},end_date.lte.${endDate})`)
      .order('event_date', { ascending: true });

    if (error) {
      throw new InternalServerError(`Failed to fetch company events: ${error.message}`);
    }

    return events || [];

  } catch (error) {
    logger.error('Error fetching company events:', error);
    throw error;
  }
};

export const getCompanyEventById = async (eventId) => {
  try {
    const { data: event, error } = await supabase
      .from('company_events')
      .select('*, created_by_user:users!company_events_created_by_fkey(id, email, employee_id)')
      .eq('id', eventId)
      .single();

    if (error || !event) {
      throw new NotFoundError('Company event not found');
    }

    return event;

  } catch (error) {
    logger.error(`Error fetching company event ${eventId}:`, error);
    throw error;
  }
};

export const updateCompanyEvent = async (eventId, eventData, userId) => {
  try {

    const oldEvent = await getCompanyEventById(eventId);

    const { title, description, event_date, end_date, event_type, is_recurring, recurrence_pattern } = eventData;

    if (end_date && new Date(end_date) < new Date(event_date)) {
      throw new BadRequestError('End date cannot be before event date');
    }

    const { data: updatedEvent, error } = await supabase
      .from('company_events')
      .update({
        title,
        description,
        event_date,
        end_date: end_date || null,
        event_type,
        is_recurring: is_recurring || false,
        recurrence_pattern: recurrence_pattern || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .select()
      .single();

    if (error) {
      throw new InternalServerError(`Failed to update company event: ${error.message}`);
    }

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'company_events',
      record_id: eventId,
      old_values: oldEvent,
      new_values: updatedEvent,
      timestamp: new Date().toISOString()
    });

    logger.info(`Company event updated: ${updatedEvent.title} (${updatedEvent.event_type})`);

    return updatedEvent;

  } catch (error) {
    logger.error(`Error updating company event ${eventId}:`, error);
    throw error;
  }
};

export const deleteCompanyEvent = async (eventId, userId) => {
  try {

    const event = await getCompanyEventById(eventId);

    const { error } = await supabase
      .from('company_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      throw new InternalServerError(`Failed to delete company event: ${error.message}`);
    }

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: 'company_events',
      record_id: eventId,
      old_values: event,
      timestamp: new Date().toISOString()
    });

    logger.info(`Company event deleted: ${event.title} (${event.event_type})`);

    return event;

  } catch (error) {
    logger.error(`Error deleting company event ${eventId}:`, error);
    throw error;
  }
};

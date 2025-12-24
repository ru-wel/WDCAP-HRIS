import { supabase } from '../config/supabase.js';
import { NotFoundError, InternalServerError, ConflictError } from '../utils/errors.js';
import { AUDIT_ACTIONS, ONBOARDING_STATUSES } from '../config/constants.js';
import logger from '../utils/logger.js';

export const createChecklistForEmployee = async (employeeId, userId) => {
  try {
    const { data: items, error: fetchError } = await supabase
      .from('onboarding_items')
      .select('id, item_name, is_required_by_default')
      .order('display_order', { ascending: true });

    if (fetchError) {
      throw new InternalServerError(fetchError.message);
    }

    if (!items || items.length === 0) {
      logger.info(`No onboarding items found to create checklist for employee ${employeeId}`);
      return [];
    }

    const checklistItems = items.map(item => ({
      employee_id: employeeId,
      checklist_item_id: item.id,
      is_required: item.is_required_by_default,
      status: ONBOARDING_STATUSES.PENDING
    }));

    const { data: createdItems, error: insertError } = await supabase
      .from('onboarding_checklists')
      .insert(checklistItems)
      .select();

    if (insertError) {
      throw new InternalServerError(insertError.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'onboarding_checklists',
      record_id: employeeId,
      new_values: { employee_id: employeeId, items_count: createdItems.length },
      timestamp: new Date().toISOString()
    });

    logger.info(`Onboarding checklist created for employee ${employeeId}: ${createdItems.length} items`);

    return createdItems;

  } catch (error) {
    logger.error(`Error creating checklist for employee ${employeeId}:`, error);
    throw error;
  }
};

export const getEmployeeChecklist = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
          id,
          is_required,
          status,
          remarks,
          submitted_at,
          reviewed_at,
          onboarding_items (
            id,
            item_name,
            display_order
          ),
          documents (
            id,
            file_name,
            file_path,
            uploaded_at
          ),
          reviewed_by:users!onboarding_checklists_reviewed_by_fkey (
            id,
            email
          )
        `)
      .eq('employee_id', employeeId)
      .order('onboarding_items(display_order)', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];

  } catch (error) {
    logger.error(`Error fetching checklist for employee ${employeeId}:`, error);
    throw error;
  }
};

export const getAllChecklists = async () => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
        id,
        employee_id,
        is_required,
        status,
        remarks,
        submitted_at,
        reviewed_at,
        employees (
          id,
          employee_id,
          first_name,
          last_name
        ),
        onboarding_items (
          id,
          item_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];

  } catch (error) {
    logger.error('Error fetching all checklists:', error);
    throw error;
  }
};

export const getChecklistItemById = async (checklistId) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
          id,
          employee_id,
          is_required,
          status,
          remarks,
          submitted_at,
          reviewed_at,
          onboarding_items (
            id,
            item_name
          ),
          documents (
            id,
            file_name,
            file_url
          )
        `)
      .eq('id', checklistId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Checklist item not found');
    }

    return data;

  } catch (error) {
    logger.error(`Error fetching checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const updateChecklistItem = async (checklistId, updates, userId) => {
  try {
    const { data: existingItem, error: fetchError } = await supabase
      .from('onboarding_checklists')
      .select('*')
      .eq('id', checklistId)
      .single();

    if (fetchError || !existingItem) {
      throw new NotFoundError('Checklist item not found');
    }

    const { data, error } = await supabase
      .from('onboarding_checklists')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', checklistId)
      .select()
      .single();

    if (error) {
      throw new InternalServerError(error.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'onboarding_checklists',
      record_id: checklistId,
      old_values: existingItem,
      new_values: data,
      timestamp: new Date().toISOString()
    });

    logger.info(`Checklist item updated: ${checklistId}`);

    return data;

  } catch (error) {
    logger.error(`Error updating checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const submitDocument = async (checklistId, documentId, userId) => {
  try {
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new NotFoundError('Document not found');
    }

    const updates = {
      document_id: documentId,
      status: ONBOARDING_STATUSES.SUBMITTED,
      submitted_at: new Date().toISOString()
    };

    return await updateChecklistItem(checklistId, updates, userId);

  } catch (error) {
    logger.error(`Error submitting document for checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const reviewSubmission = async (checklistId, status, remarks, reviewerId) => {
  try {
    const updates = {
      status,
      remarks: remarks || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId
    };

    return await updateChecklistItem(checklistId, updates, reviewerId);

  } catch (error) {
    logger.error(`Error reviewing checklist item ${checklistId}:`, error);
    throw error;
  }
};
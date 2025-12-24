import { supabase } from "../config/supabase.js";
import { InternalServerError, NotFoundError, ConflictError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

export const getAllOnboardingItems = async () => {
  try {
    const { data, error } = await supabase
      .from('onboarding_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];

  } catch (error) {
    logger.error('Error fetching onboarding items:', error);
    throw error;
  }
};

export const getOnboardingItemById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Onboarding item not found');
    }

    return data;

  } catch (error) {
    logger.error(`Error fetching onboarding item ${id}:`, error);
    throw error;
  }
};

export const createOnboardingItem = async (itemData, userId) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // postgres unique constraint violation
        throw new ConflictError('An onboarding item with this name already exists');
      }
      throw new InternalServerError(error.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'onboarding_items',
      record_id: data.id,
      new_values: data,
      timestamp: new Date().toISOString()
    });

    logger.info(`New onboarding item created: ${data.item_name}`);

    return data;

  } catch (error) {
    logger.error('Error creating onboarding item:', error);
    throw error;
  }
};

export const updateOnboardingItem = async (id, updates, userId) => {
  try {
    const { data: existingItem, error: fetchError } = await supabase
      .from('onboarding_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingItem) {
      throw new NotFoundError('Onboarding item not found');
    }

    // Update the item
    const { data, error } = await supabase
      .from('onboarding_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError('An onboarding item with this name already exists');
      }
      throw new InternalServerError(error.message);
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'onboarding_items',
      record_id: id,
      old_values: existingItem,
      new_values: data,
      timestamp: new Date().toISOString()
    });

    logger.info(`Onboarding item updated: ${data.item_name}`);

    return data;

  } catch (error) {
    logger.error(`Error updating onboarding item ${id}:`, error);
    throw error;
  }
};

export const deleteOnboardingItem = async (id, userId) => {
  try {
    const { data: existingItem, error: fetchError } = await supabase
      .from('onboarding_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingItem) {
      throw new NotFoundError('Onboarding item not found');
    }

    const { data, error } = await supabase
      .from('onboarding_items')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23503') { // postgres foreign key constraint violation
        throw new ConflictError('Cannot delete this item because it is assigned to employee checklists');
      }
      throw new InternalServerError(error.message);
    }

    // Log to audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: 'onboarding_items',
      record_id: id,
      old_values: existingItem,
      timestamp: new Date().toISOString()
    });

    logger.info(`Onboarding item deleted: ${existingItem.item_name}`);

    return data;

  } catch (error) {
    logger.error(`Error deleting onboarding item ${id}:`, error);
    throw error;
  }
};
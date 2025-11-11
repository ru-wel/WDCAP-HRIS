import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, ConflictError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

// create a new position
export const createNewPosition = async (positionTitle, userId) => {
  try {
    const { data: existingPosition, error: checkError } = await supabase
      .from('positions')
      .select('id, position_title')
      .eq('position_title', positionTitle)
      .single();

    if (existingPosition){
      throw new ConflictError('Position already exists');
    };

    const { data: newPosition, error: insertError } = await supabase
      .from('positions')
      .insert([
        {
          position_title: positionTitle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError){
      throw new InternalServerError('Failed to create');
    }
    
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'positions',
      record_id: newPosition.id,
      new_values: newPosition,
      timestamp: new Date().toISOString()
    });

    logger.info(`New position created: ${newPosition.position_title}`);

    return newPosition;

  } catch (error) {
    logger.error('Error creating position', error);
    throw error;
  }
};

export const getAllPositions = async () => {
  try {
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .order('position_title', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return positions || [];

  } catch (error) {
    logger.error('Error fetching positions:', error);
    throw error;
  }
};

export const getPositionById = async (positionId) => {
  try {
    const { data: position, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (error || !position) {
      throw new NotFoundError('Position not found');
    }

    return position;

  } catch (error) {
    logger.error(`Error fetching position ${positionId}:`, error);
    throw error;
  }
};

export const updatePosition = async (positionId, positionTitle, userId) => {
  try {
    const { data: existingPosition, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (fetchError || !existingPosition) {
      throw new NotFoundError('Position not found');
    }

    if (positionTitle && positionTitle !== existingPosition.position_title){
      const { data: duplicatePost, error: dupError } = await supabase
        .from('positions')
        .select('id')
        .eq('position_title', positionTitle)
        .single();

      if (duplicatePost) {
        throw new ConflictError('Position name already exists');
      }
    }

    const { data: updatedPosition, error: updateError } = await supabase
      .from('positions')
      .update({
        position_title: positionTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', positionId)
      .select()
      .single()

    if (updateError){
      throw new InternalServerError(updateError.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'positions',
      record_id: updatedPosition.id,
      old_values: existingPosition,
      new_values: updatedPosition,
      timestamp: new Date().toISOString()
    });

    logger.info(`Position updated: ${updatedPosition.position_title}`);

    return updatedPosition;

  } catch (error) {
    logger.error(`Error updating position ${positionId}:`, error);
    throw error;
  }
};

export const deletePosition = async (positionId, userId) => {
  try {
    const { data: existingPosition, error: fetchError } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (fetchError || !existingPosition) {
      throw new NotFoundError('Position not found');
    }

    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('position_id', positionId)
      .limit(1);

    if (empError){
      throw new InternalServerError('Failed to check position');
    }

    if (employees && employees.length > 0) {
      throw new ConflictError('Cannot delete position with existing employees');
    }

    const { data: deletedPosition, error: deleteError } = await supabase
      .from('positions')
      .delete()
      .eq('id', positionId)
      .select()
      .single();

    if (deleteError) {
      throw new InternalServerError(deleteError.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: 'positions',
      record_id: deletedPosition.id,
      old_values: existingPosition,
      timestamp: new Date().toISOString()
    });

    logger.info(`Position deleted ${deletedPosition.position_title}`);

    return deletedPosition;

  } catch (error) {
    logger.error(`Error deleting position ${positionId}:`, error);
    throw error;
  }
};
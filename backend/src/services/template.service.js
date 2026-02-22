import { supabase } from "../config/supabase.js";
import { NotFoundError, InternalServerError, BadRequestError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

const auditLog = async (userId, actionType, tableName, recordId, newValues, oldValues) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: actionType,
      table_name: tableName,
      record_id: String(recordId),
      new_values: newValues || null,
      old_values: oldValues || null,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    logger.warn('Audit log failed for template operation:', e);
  }
};

const TEMPLATE_WITH_DETAILS = `
  id, name, description,
  scoring_scale, performance_ratings,
  is_active, created_by, created_at, updated_at,
  evaluation_template_sections (
    id, section_number, title, description,
    evaluation_template_items (
      id, item_number, question_text
    )
  )
`;

const TEMPLATE_LIST_FIELDS = `
  id, name, description, is_active, created_at, updated_at
`;

const sortTemplateDetails = (template) => {
  if (!template || !template.evaluation_template_sections) return template;

  const sections = [...template.evaluation_template_sections]
    .sort((a, b) => a.section_number - b.section_number)
    .map(section => ({
      ...section,
      evaluation_template_items: [...(section.evaluation_template_items || [])]
        .sort((a, b) => a.item_number - b.item_number)
    }));

  return { ...template, evaluation_template_sections: sections };
};

// get all active templates (list view, no sections/items)
export const getActiveTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('evaluation_templates')
      .select(TEMPLATE_LIST_FIELDS)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching active templates:', error);
    throw error;
  }
};

// get all templates including inactive (for admin views)
export const getAllTemplates = async () => {
  try {
    const { data, error } = await supabase
      .from('evaluation_templates')
      .select(TEMPLATE_LIST_FIELDS)
      .order('name', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching all templates:', error);
    throw error;
  }
};

// get a single template with full details (sections + items)
export const getTemplateById = async (templateId) => {
  try {
    const { data: template, error: templateError } = await supabase
      .from('evaluation_templates')
      .select('id, name, description, scoring_scale, performance_ratings, is_active, created_by, created_at, updated_at')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      throw new NotFoundError('Evaluation template not found');
    }

    const { data: sections, error: sectionsError } = await supabase
      .from('evaluation_template_sections')
      .select('id, section_number, title, description, template_id')
      .eq('template_id', templateId)
      .order('section_number', { ascending: true });

    if (sectionsError) {
      throw new InternalServerError(sectionsError.message);
    }

    if (!sections || sections.length === 0) {
      return { ...template, evaluation_template_sections: [] };
    }

    const sectionIds = sections.map(s => s.id);
    const { data: items, error: itemsError } = await supabase
      .from('evaluation_template_items')
      .select('id, item_number, question_text, section_id')
      .in('section_id', sectionIds)
      .order('item_number', { ascending: true });

    if (itemsError) {
      throw new InternalServerError(itemsError.message);
    }

    const itemsBySection = {};
    (items || []).forEach(item => {
      if (!itemsBySection[item.section_id]) {
        itemsBySection[item.section_id] = [];
      }
      itemsBySection[item.section_id].push(item);
    });

    const evaluation_template_sections = sections.map(section => ({
      ...section,
      evaluation_template_items: itemsBySection[section.id] || []
    }));

    return {
      ...template,
      evaluation_template_sections
    };
  } catch (error) {
    logger.error(`Error fetching template ${templateId}:`, error);
    throw error;
  }
};

// get the template assigned to a specific position
export const getTemplateForPosition = async (positionId) => {
  try {
    const { data: position, error: posError } = await supabase
      .from('positions')
      .select('id, position_title')
      .eq('id', positionId)
      .single();

    if (posError || !position) {
      throw new NotFoundError('Position not found');
    }

    // fetch the assignment with full template details
    const { data, error } = await supabase
      .from('position_template_assignments')
      .select(`
        id, position_id, template_id, created_at,
        evaluation_templates (${TEMPLATE_WITH_DETAILS})
      `)
      .eq('position_id', positionId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new InternalServerError(error.message);
    }

    // position has no template assigned OR template is inactive
    if (!data || !data.evaluation_templates || data.evaluation_templates.is_active === false) {
      return null;
    }

    return sortTemplateDetails(data.evaluation_templates);
  } catch (error) {
    logger.error(`Error fetching template for position ${positionId}:`, error);
    throw error;
  }
};

// get all position-template assignments (for admin overview)
export const getPositionTemplateAssignments = async () => {
  try {
    const { data, error } = await supabase
      .from('position_template_assignments')
      .select(`
        id, position_id, template_id, created_at,
        positions (id, position_title),
        evaluation_templates (id, name, is_active)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching position-template assignments:', error);
    throw error;
  }
};

// create new evaluation template with sections and items.

export const createTemplate = async (payload, userId) => {
  const { sections: sectionPayloads, ...templateFields } = payload;

  const { data: template, error: tErr } = await supabase
    .from('evaluation_templates')
    .insert({
      ...templateFields,
      created_by: userId || null,
    })
    .select('id')
    .single();

  if (tErr) {
    logger.error('Error creating template:', tErr);
    throw new InternalServerError(tErr.message);
  }

  const templateId = template.id;

  if (sectionPayloads?.length) {
    for (const sec of sectionPayloads) {
      const { items: itemPayloads, ...sectionFields } = sec;

      const { data: section, error: sErr } = await supabase
        .from('evaluation_template_sections')
        .insert({ ...sectionFields, template_id: templateId })
        .select('id')
        .single();

      if (sErr) {
        logger.error('Error creating section:', sErr);
        throw new InternalServerError(sErr.message);
      }

      if (itemPayloads?.length) {
        const itemRows = itemPayloads.map(item => ({
          ...item,
          section_id: section.id,
        }));

        const { error: iErr } = await supabase
          .from('evaluation_template_items')
          .insert(itemRows);

        if (iErr) {
          logger.error('Error creating items:', iErr);
          throw new InternalServerError(iErr.message);
        }
      }
    }
  }

  await auditLog(userId, AUDIT_ACTIONS.CREATE, 'evaluation_templates', templateId, {
    name: templateFields.name,
    description: templateFields.description || null,
    sections_count: sectionPayloads?.length || 0,
  });

  return getTemplateById(templateId);
};

// update template
export const updateTemplate = async (templateId, payload, userId) => {
  const existing = await getTemplateById(templateId);
  if (!existing) throw new NotFoundError('Template not found');

  const { data, error } = await supabase
    .from('evaluation_templates')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId)
    .select('id')
    .single();

  if (error) {
    logger.error(`Error updating template ${templateId}:`, error);
    throw new InternalServerError(error.message);
  }

  await auditLog(userId, AUDIT_ACTIONS.UPDATE, 'evaluation_templates', templateId, payload, {
    name: existing.name,
    description: existing.description,
  });

  return getTemplateById(data.id);
};

export const deactivateTemplate = async (templateId, userId) => {
  const existing = await getTemplateById(templateId);
  if (!existing) throw new NotFoundError('Template not found');

  const { error } = await supabase
    .from('evaluation_templates')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    logger.error(`Error deactivating template ${templateId}:`, error);
    throw new InternalServerError(error.message);
  }

  await auditLog(userId, AUDIT_ACTIONS.UPDATE, 'evaluation_templates', templateId, {
    is_active: false,
    template_name: existing.name,
  }, {
    is_active: true,
  });

  return { id: templateId, is_active: false };
};

export const reactivateTemplate = async (templateId, userId) => {
  const existing = await getTemplateById(templateId);
  if (!existing) throw new NotFoundError('Template not found');

  const { error } = await supabase
    .from('evaluation_templates')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    logger.error(`Error reactivating template ${templateId}:`, error);
    throw new InternalServerError(error.message);
  }

  await auditLog(userId, AUDIT_ACTIONS.UPDATE, 'evaluation_templates', templateId, {
    is_active: true,
    template_name: existing.name,
  }, {
    is_active: false,
  });

  return { id: templateId, is_active: true };
};

// add section to template
export const addSection = async (templateId, payload, userId) => {
  await getTemplateById(templateId);

  const { items: itemPayloads, ...sectionFields } = payload;

  const { data: section, error: sErr } = await supabase
    .from('evaluation_template_sections')
    .insert({ ...sectionFields, template_id: templateId })
    .select('id, section_number, title, description')
    .single();

  if (sErr) {
    logger.error('Error adding section:', sErr);
    throw new InternalServerError(sErr.message);
  }

  if (itemPayloads?.length) {
    const itemRows = itemPayloads.map(item => ({
      ...item,
      section_id: section.id,
    }));

    const { error: iErr } = await supabase
      .from('evaluation_template_items')
      .insert(itemRows);

    if (iErr) {
      logger.error('Error adding items to new section:', iErr);
      throw new InternalServerError(iErr.message);
    }
  }

  await supabase
    .from('evaluation_templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  await auditLog(userId, AUDIT_ACTIONS.CREATE, 'evaluation_templates', templateId, {
    action: 'add_section',
    section_title: section.title,
    section_number: section.section_number,
    items_count: itemPayloads?.length || 0,
  });

  return getTemplateById(templateId);
};

export const updateSection = async (templateId, sectionId, payload, userId) => {

  await getTemplateById(templateId);

  const { error } = await supabase
    .from('evaluation_template_sections')
    .update(payload)
    .eq('id', sectionId)
    .eq('template_id', templateId);

  if (error) {
    logger.error(`Error updating section ${sectionId}:`, error);
    throw new InternalServerError(error.message);
  }

  await supabase
    .from('evaluation_templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  await auditLog(userId, AUDIT_ACTIONS.UPDATE, 'evaluation_templates', templateId, {
    action: 'update_section',
    section_id: sectionId,
    ...payload,
  });

  return getTemplateById(templateId);
};

export const deleteSection = async (templateId, sectionId, userId) => {
  const existing = await getTemplateById(templateId);
  const sectionToDelete = existing?.evaluation_template_sections?.find(s => s.id === sectionId);

  // CASCADE will delete items automatically
  const { error } = await supabase
    .from('evaluation_template_sections')
    .delete()
    .eq('id', sectionId)
    .eq('template_id', templateId);

  if (error) {
    logger.error(`Error deleting section ${sectionId}:`, error);
    throw new InternalServerError(error.message);
  }

  await supabase
    .from('evaluation_templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  await auditLog(userId, AUDIT_ACTIONS.DELETE, 'evaluation_templates', templateId, null, {
    action: 'delete_section',
    section_id: sectionId,
    section_title: sectionToDelete?.title || null,
  });

  return getTemplateById(templateId);
};

export const addItem = async (templateId, sectionId, payload, userId) => {

  const { data: section, error: secErr } = await supabase
    .from('evaluation_template_sections')
    .select('id')
    .eq('id', sectionId)
    .eq('template_id', templateId)
    .maybeSingle();

  if (secErr || !section) {
    throw new NotFoundError('Section not found in this template');
  }

  const { error } = await supabase
    .from('evaluation_template_items')
    .insert({ ...payload, section_id: sectionId });

  if (error) {
    logger.error('Error adding item:', error);
    throw new InternalServerError(error.message);
  }

  await supabase
    .from('evaluation_templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  await auditLog(userId, AUDIT_ACTIONS.CREATE, 'evaluation_templates', templateId, {
    action: 'add_item',
    section_id: sectionId,
    question_text: payload.question_text,
    item_number: payload.item_number,
  });

  return getTemplateById(templateId);
};

export const updateItem = async (templateId, sectionId, itemId, payload, userId) => {
  const { data: section, error: secErr } = await supabase
    .from('evaluation_template_sections')
    .select('id')
    .eq('id', sectionId)
    .eq('template_id', templateId)
    .maybeSingle();

  if (secErr || !section) {
    throw new NotFoundError('Section not found in this template');
  }

  const { error } = await supabase
    .from('evaluation_template_items')
    .update(payload)
    .eq('id', itemId)
    .eq('section_id', sectionId);

  if (error) {
    logger.error(`Error updating item ${itemId}:`, error);
    throw new InternalServerError(error.message);
  }

  await supabase
    .from('evaluation_templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  await auditLog(userId, AUDIT_ACTIONS.UPDATE, 'evaluation_templates', templateId, {
    action: 'update_item',
    section_id: sectionId,
    item_id: itemId,
    ...payload,
  });

  return getTemplateById(templateId);
};

export const deleteItem = async (templateId, sectionId, itemId, userId) => {
  const { data: section, error: secErr } = await supabase
    .from('evaluation_template_sections')
    .select('id')
    .eq('id', sectionId)
    .eq('template_id', templateId)
    .maybeSingle();

  if (secErr || !section) {
    throw new NotFoundError('Section not found in this template');
  }

  const { error } = await supabase
    .from('evaluation_template_items')
    .delete()
    .eq('id', itemId)
    .eq('section_id', sectionId);

  if (error) {
    logger.error(`Error deleting item ${itemId}:`, error);
    throw new InternalServerError(error.message);
  }

  await supabase
    .from('evaluation_templates')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', templateId);

  await auditLog(userId, AUDIT_ACTIONS.DELETE, 'evaluation_templates', templateId, null, {
    action: 'delete_item',
    section_id: sectionId,
    item_id: itemId,
  });

  return getTemplateById(templateId);
};

export const assignTemplateToPosition = async (positionId, templateId, userId) => {

  const { data: position, error: posErr } = await supabase
    .from('positions')
    .select('id, position_title')
    .eq('id', positionId)
    .maybeSingle();

  if (posErr || !position) {
    throw new NotFoundError('Position not found');
  }

  const template = await getTemplateById(templateId);

  const { data, error } = await supabase
    .from('position_template_assignments')
    .upsert({ position_id: positionId, template_id: templateId }, { onConflict: 'position_id' })
    .select(`
      id, position_id, template_id, created_at,
      positions (id, position_title),
      evaluation_templates (id, name)
    `)
    .single();

  if (error) {
    logger.error('Error assigning template to position:', error);
    throw new InternalServerError(error.message);
  }

  await auditLog(userId, AUDIT_ACTIONS.UPDATE, 'evaluation_templates', templateId, {
    action: 'assign_to_position',
    position_id: positionId,
    position_title: position.position_title,
    template_name: template.name,
  });

  return data;
};

export const unassignTemplateFromPosition = async (positionId, userId) => {
  const { data: existing } = await supabase
    .from('position_template_assignments')
    .select('template_id, positions (position_title), evaluation_templates (name)')
    .eq('position_id', positionId)
    .maybeSingle();

  const { error } = await supabase
    .from('position_template_assignments')
    .delete()
    .eq('position_id', positionId);

  if (error) {
    logger.error(`Error unassigning template from position ${positionId}:`, error);
    throw new InternalServerError(error.message);
  }

  await auditLog(userId, AUDIT_ACTIONS.DELETE, 'evaluation_templates', existing?.template_id || positionId, null, {
    action: 'unassign_from_position',
    position_id: positionId,
    position_title: existing?.positions?.position_title || null,
    template_name: existing?.evaluation_templates?.name || null,
  });

  return { position_id: positionId, template_id: null };
};

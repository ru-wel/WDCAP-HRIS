import Joi from 'joi';

const uuid = () => Joi.string().uuid();

export const templateIdParamSchema = Joi.object({
  id: uuid().required().messages({
    'string.guid': 'Template ID must be a valid UUID',
    'any.required': 'Template ID is required'
  })
});

export const positionIdParamSchema = Joi.object({
  positionId: uuid().required().messages({
    'string.guid': 'Position ID must be a valid UUID',
    'any.required': 'Position ID is required'
  })
});

const scoringScaleItem = Joi.object({
  value: Joi.number().integer().required(),
  label: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
});

const performanceRatingItem = Joi.object({
  min_score: Joi.number().integer().required(),
  max_score: Joi.number().integer().greater(Joi.ref('min_score')).required(),
  label: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
});

const noOverlappingRanges = (ratings, helpers) => {
  for (let i = 0; i < ratings.length; i++) {
    for (let j = i + 1; j < ratings.length; j++) {
      const a = ratings[i];
      const b = ratings[j];
      if (a.min_score <= b.max_score && b.min_score <= a.max_score) {
        return helpers.error('any.invalid', {
          message: `Performance rating ranges overlap: ${a.min_score}–${a.max_score} and ${b.min_score}–${b.max_score}`,
        });
      }
    }
  }
  return ratings;
};

const performanceRatingsSchema = Joi.array()
  .items(performanceRatingItem)
  .min(1)
  .custom(noOverlappingRanges, 'no overlapping ranges')
  .messages({ 'any.invalid': '{{#message}}' });

const itemSchema = Joi.object({
  item_number: Joi.number().integer().min(1).required(),
  question_text: Joi.string().max(1000).required(),
});

const sectionSchema = Joi.object({
  section_number: Joi.number().integer().min(1).required(),
  title: Joi.string().max(255).required(),
  description: Joi.string().allow('', null).optional(),
  items: Joi.array().items(itemSchema).min(1).required(),
});

export const createTemplateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().allow('', null).optional(),
  scoring_scale: Joi.array().items(scoringScaleItem).min(1).required(),
  performance_ratings: performanceRatingsSchema.required(),
  sections: Joi.array().items(sectionSchema).min(1).required(),
});

export const updateTemplateSchema = Joi.object({
  id: uuid().required(), // from params
  name: Joi.string().max(255).optional(),
  description: Joi.string().allow('', null).optional(),
  scoring_scale: Joi.array().items(scoringScaleItem).min(1).optional(),
  performance_ratings: performanceRatingsSchema.optional(),
}).min(2); // at least id + one field to update

export const sectionParamsSchema = Joi.object({
  id: uuid().required(),
  sectionId: uuid().required(),
});

export const itemParamsSchema = Joi.object({
  id: uuid().required(),
  sectionId: uuid().required(),
  itemId: uuid().required(),
});

export const addSectionSchema = Joi.object({
  id: uuid().required(), // template id from params
  section_number: Joi.number().integer().min(1).required(),
  title: Joi.string().max(255).required(),
  description: Joi.string().allow('', null).optional(),
  items: Joi.array().items(itemSchema).optional(),
});

export const updateSectionSchema = Joi.object({
  id: uuid().required(),
  sectionId: uuid().required(),
  section_number: Joi.number().integer().min(1).optional(),
  title: Joi.string().max(255).optional(),
  description: Joi.string().allow('', null).optional(),
});

export const addItemSchema = Joi.object({
  id: uuid().required(),
  sectionId: uuid().required(),
  item_number: Joi.number().integer().min(1).required(),
  question_text: Joi.string().max(1000).required(),
});

export const updateItemSchema = Joi.object({
  id: uuid().required(),
  sectionId: uuid().required(),
  itemId: uuid().required(),
  item_number: Joi.number().integer().min(1).optional(),
  question_text: Joi.string().max(1000).optional(),
});

export const assignTemplateSchema = Joi.object({
  positionId: uuid().required().messages({
    'string.guid': 'Position ID must be a valid UUID',
    'any.required': 'Position ID is required',
  }),
  templateId: uuid().required().messages({
    'string.guid': 'Template ID must be a valid UUID',
    'any.required': 'Template ID is required',
  }),
});

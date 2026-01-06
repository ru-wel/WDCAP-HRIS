import { BadRequestError } from "../utils/errors.js";

export const validate = (schema) => {
  return (req, res, next) => {
    // Validate a merged view of params/query/body so schemas work for GET routes too.
    // Keep behavior consistent with existing route usage.
    const input = {
      ...(req.params || {}),
      ...(req.query || {}),
      ...(req.body || {}),
    };

    const { error, value } = schema.validate(input, {
      abortEarly: false, // return all errors
      stripUnknown: true, // remove fields not defined in schema
    });

    if (error){ // if validation fails, throw BadRequestError with details
      const errorMessages = error.details.map(detail => detail.message);
      throw new BadRequestError(errorMessages.join(', '));
    }

    // Preserve the original controller expectations (most controllers read req.body for writes,
    // and req.params/req.query for reads). We still store the validated value on req.body.
    req.body = value;
    next();
  };
};
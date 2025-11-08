import { BadRequestError } from "../utils/errors.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // return all errors
      stripUnknown: true, // remove fields not defined in schema
    });

    if (error){ // if validation fails, throw BadRequestError with details
      const errorMessages = error.details.map(detail => detail.message);
      throw new BadRequestError(errorMessages.join(', '));
    }

    req.body = value;
    next();
  };
};
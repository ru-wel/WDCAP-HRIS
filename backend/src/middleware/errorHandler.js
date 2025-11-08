import logger from "../utils/logger.js";

// global error handling middleware
const errorHandler = (err, req, res, next) => {   // express default error handling
  const statusCode = err.statusCode || 500;       // default to 500 if no status code
  const isExpected = err.isExpected || false;     // check if error is expected or bug
  if (statusCode >= 500){                         // if error code is 500+, log full error
    logger.error(`${err.message}`, {
      statusCode,
      path: req.path,
      method: req.method,
      stack: err.stack,
      isExpected
    });
  } else {
      // Client errors - log without stack trace/message
      logger.warn(`${err.message}`, {
        statusCode,
        path: req.path,
        method: req.method
      });
    }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
};

export default errorHandler;
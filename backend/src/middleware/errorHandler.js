import logger from "../utils/logger.js";
import { FILE_VALIDATION } from "../config/constants.js";

const formatMaxMb = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.round(n / (1024 * 1024)));
};

// global error handling middleware
const errorHandler = (err, req, res, next) => {   // express default error handling
  // Normalize common upload errors (multer)
  if (err?.name === 'MulterError') {
    const maxMb = formatMaxMb(FILE_VALIDATION?.MAX_FILE_SIZE) || '10';
    if (err.code === 'LIMIT_FILE_SIZE') {
      err.statusCode = 400;
      err.isExpected = true;
      err.message = `File is too large. Maximum size is ${maxMb}MB.`;
    } else {
      err.statusCode = 400;
      err.isExpected = true;
      err.message = err.message || 'Upload failed.';
    }
  }

  if (!err?.statusCode && err?.message && /^Invalid file type\./i.test(err.message)) {
    err.statusCode = 400;
    err.isExpected = true;
  }

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
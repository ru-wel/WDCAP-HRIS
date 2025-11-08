// COMMON ERROR CODES AND CLASSES

// base custom error class
class AppError extends Error {
  constructor(message, statusCode){
    super(message);
    this.statusCode = statusCode;
    this.isExpected = true; // error is expected, not a bug
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request - Invalid data
class BadRequestError extends AppError {
  constructor(message = 'Bad Request'){
    super(message, 400);
  }
}

// 401 Unauthorized - Authentication failed
class UnauthorizedError extends AppError{
  constructor(message = 'Unauthorized'){
    super(message, 401);
  }
}

// 403 Forbidden - Access denied
class ForbiddenError extends AppError{
  constructor(message = 'Forbidden'){
    super(message, 403);
  }
}

// 404 Not Found - Resource not found
class NotFoundError extends AppError{
  constructor(message = 'Resource not found'){
    super(message, 404);
  }
}

// 409 Conflict - Resource already exists
class ConflictError extends AppError{
  constructor(message = 'Conflict'){
    super(message, 409);
  }
}

// 500 Internal Server Error - Database or server errors
class InternalServerError extends AppError{
  constructor(message = 'Internal Server Error'){
    super(message, 500);
  }
}

export { AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, InternalServerError }; 
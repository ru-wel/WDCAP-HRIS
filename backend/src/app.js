import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './utils/logger.js';
import { generalLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Guard against accidental env lines like `=value` creating an empty-key entry.
if (Object.prototype.hasOwnProperty.call(process.env, '')) {
  delete process.env[''];
}

const app = express();

app.use(helmet()); // set security headers
app.use(cors({
  origin: [
    'http://localhost:5173',                                 // local URL
    'https://hris-frontend-715830193633.asia-east2.run.app'  // production URL
  ],
  credentials: true
}));
app.use(generalLimiter); // rate limiting for all routes

// logging middleware
if (process.env.NODE_ENV === 'development'){
  app.use(morgan('dev'));         // detailed logging in dev
} else {
  app.use(morgan('combined', {    // minimal logging in prod
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

app.use(express.json()); // parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // parse URL-encoded request bodies

// API routes
app.use('/api', routes);

// ^ ADD MORE ROUTES ABOVE THIS LINE ^

// global 404 error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

// global error handling middleware
app.use(errorHandler);

export default app;
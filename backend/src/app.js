import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();

app.use(helmet()); // set security headers
app.use(cors({
  origin: '*', // change later
  credentials: true
}));

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
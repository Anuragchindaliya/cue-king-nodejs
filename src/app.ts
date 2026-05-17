import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/error.middleware';
import { setupSwagger } from './config/swagger';

// Initialize express app
const app = express();

// Setup Swagger
setupSwagger(app);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', apiLimiter);

import path from 'path';

// Serve static files (for image uploads later)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Base Route
app.get('/', (req:Request, res:Response) => {
  res.send('Cue King API is running...');
});

import routes from './routes';
app.use('/api', routes);

// Error Handling Middleware (must be last)
app.use(errorHandler);

export default app;

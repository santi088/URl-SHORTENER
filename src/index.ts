import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import {router as codeRouter} from './routes/codes.route.js';
import {router as clickRouter} from './routes/clicks.route.js'
// 2. Initialize Express app
const app = express();

app.use(express.json())

// 3. Use pino-http middleware
// This automatically logs all HTTP requests/responses
app.use(pinoHttp({ logger }));
app.use('/api/code', codeRouter)
app.use('/api/clicks', clickRouter)

app.listen(3000, () => {
  logger.info('Server is running on port 3000');
});   
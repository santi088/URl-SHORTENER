import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import {router as codeRouter} from './routes/codes.route.js';
import {router as clickRouter} from './routes/clicks.route.js'
import limitter from './middlewares/rate.limiter.js';

const app = express();

app.use(limitter)

app.use(express.json())
app.use(pinoHttp({ logger }));


app.use('/api/code', codeRouter)

app.listen(3000, () => {
  logger.info('Server is running on port 3000');
});   
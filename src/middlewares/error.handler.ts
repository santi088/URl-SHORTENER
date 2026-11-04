import type { Request, Response, NextFunction } from 'express';
import { logger} from '../logger.js';
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction){
  const errno = (err as any).errno as number | undefined;

  if (errno !== undefined) {
    switch (errno) {
        case 1062:
        return res.status(503).json({ error: 'Try again later' });
        case 1146:
        case 1054:
            return res.status(500).json({ error: 'Database schema error' });
        case 1213:
        case 1205:
            return res.status(503).json({ error: 'Try again later' });
    }
  }

  // Generic fallback
  logger.error({ err}, 'Failed to create code');
  res.status(500).json({ error: 'Internal server error' });
}   
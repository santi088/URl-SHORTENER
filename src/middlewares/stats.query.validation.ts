import type { Request, Response, NextFunction } from 'express';
import { statsQuerySchema } from '../schemas/codes.schemas.js';

export function validateQuery(req: Request, res: Response, next: NextFunction) {
    const result = statsQuerySchema.safeParse({...req.query});
    
    if(!result.success){
        return res.status(400).json({"message": "bad request"});
    }

    req.body = result.data
    next()
}
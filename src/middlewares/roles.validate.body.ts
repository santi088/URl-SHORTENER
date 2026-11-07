import type { Request, Response, NextFunction } from 'express';
import * as z from 'zod';
import ipaddr from 'ipaddr.js';

const BLOCKED_RANGES = ['loopback', 'private', 'linkLocal', 'unspecified', 'uniqueLocal', 'reserved'];
const BLOCKED_HOSTS = ['localhost', 'metadata', '169.254.169.254'];

function isSafeUrl(rawUrl: string): boolean {
  const hostname = new URL(rawUrl).hostname.replace(/^\[|\]$/g, '');

  if (BLOCKED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))) return false;

  if (ipaddr.isValid(hostname)) {
    return !BLOCKED_RANGES.includes(ipaddr.parse(hostname).range());
  }

  return true;
}

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ message: "bad request" });
    }

    const data = result.data;
    if (typeof (data as any).url === 'string' && !isSafeUrl((data as any).url)) {
      return res.status(400).json({ message: "blocked target" });
    }

    req.body = data;
    next();
  };
}   
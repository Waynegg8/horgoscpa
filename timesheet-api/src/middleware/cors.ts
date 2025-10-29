/**
 * CORS 中間件
 */

import { Context, Next } from 'hono';
import { cors as honoCors } from 'hono/cors';
import { Env } from '../types';

/**
 * CORS 配置
 */
export function corsMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const origin = c.env.CORS_ORIGIN || '*';
  
  return honoCors({
    origin: origin === '*' ? '*' : [origin],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
}


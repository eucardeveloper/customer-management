import { NextRequest } from 'next/server';
import { RateLimiter } from '../../../lib/chatGuard.ts';
import { handleChat } from '../../../lib/chatHandler.ts';

const limiter = new RateLimiter();
let warnedNoSecret = false;

export async function POST(req: NextRequest) {
  return handleChat(req, {
    env: {
      N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
      N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
      GATEWAY_URL: process.env.GATEWAY_URL,
    },
    fetch,
    limiter,
    warn: (message) => {
      if (!warnedNoSecret) {
        warnedNoSecret = true;
        console.warn(message);
      }
    },
  });
}

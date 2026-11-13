import { NextRequest } from 'next/server';
import { RateLimiter } from '../../../lib/chatGuard.ts';
import { handleChat } from '../../../lib/chatHandler.ts';

const limiter = new RateLimiter();
let warnedNoSecret = false;

export async function POST(req: NextRequest) {
  return handleChat(req, {
    env: process.env,
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

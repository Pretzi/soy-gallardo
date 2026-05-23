/**
 * Loads project env files before other imports resolve (tsx/Node don't auto-load `.env`).
 * Mirrors Next.js-ish behavior: `.env` then `.env.local` overrides.
 */
import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

function safeLoad(rel: string, override: boolean) {
  const p = path.join(cwd, rel);
  if (!fs.existsSync(p)) return;
  config({ path: p, override });
}

safeLoad('.env', false);
safeLoad('.env.local', true);

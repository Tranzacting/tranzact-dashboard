/**
 * Shared env loader for the Optimize layer.
 * Resolves .env files relative to the project root, not CWD, so scripts work
 * regardless of where they're invoked from (root, Optimize/, or elsewhere).
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Optimize/scripts/_env.ts → project root is two levels up
const rootDir = path.resolve(here, '..', '..');

for (const rel of ['dashboard/.env', '.env', '.env.vercel']) {
  dotenv.config({ path: path.join(rootDir, rel), quiet: true });
}

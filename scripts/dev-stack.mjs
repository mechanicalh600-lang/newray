/**
 * اجرای همزمان API محلی (پورت 3000) و Vite (پورت 5173)
 * Usage: node scripts/dev-stack.mjs
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const children = [];

function start(label, command, args) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) console.log(`[${label}] stopped (${signal})`);
    else console.log(`[${label}] exited (${code ?? 0})`);
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Starting local API + Vite dev server...\n');
start('api', 'node', ['scripts/local-api-server.mjs']);

setTimeout(() => {
  start('vite', 'npx', ['vite']);
}, 1200);

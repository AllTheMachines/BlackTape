/**
 * kill-dev.mjs — stop all Mercury dev processes
 *
 * Kills: vite (port 5173), wrangler + workerd (port 8788)
 * Usage: npm run kill
 */

import { execSync } from 'child_process';

const isWindows = process.platform === 'win32';

function tryKill(label, cmd, opts = {}) {
  try {
    execSync(cmd, { stdio: 'pipe', ...opts });
    console.log(`  ✓ stopped ${label}`);
  } catch {
    console.log(`  ○ ${label} not running`);
  }
}

console.log('Stopping dev servers...\n');

if (isWindows) {
  // workerd — Cloudflare's JS runtime, spawned as its own binary
  tryKill('workerd', 'taskkill /F /IM workerd.exe /T');

  // Node-based processes: match by commandline via PowerShell
  // Using shell:'powershell.exe' avoids cmd.exe quoting nightmares
  const psKill = (pattern) =>
    `Get-CimInstance Win32_Process -Filter "name='node.exe'" | ` +
    `Where-Object { $_.CommandLine -like '*${pattern}*' } | ` +
    `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;

  tryKill('vite', psKill('vite'), { shell: 'powershell.exe' });
  tryKill('wrangler', psKill('wrangler'), { shell: 'powershell.exe' });
} else {
  // macOS / Linux
  tryKill('workerd', 'pkill -f workerd');
  tryKill('vite', 'pkill -f "vite dev"');
  tryKill('wrangler', 'pkill -f wrangler');
}

console.log('\nDone. Ports 5173 and 8788 are free.');

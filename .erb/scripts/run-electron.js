/**
 * Launches Electron with ELECTRON_RUN_AS_NODE removed so the app runs in normal GUI mode.
 * Required when the parent process (e.g. Cursor) sets ELECTRON_RUN_AS_NODE=1.
 */
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronPath = require('electron');
const cwd = path.join(__dirname, '../..');

const child = spawn(electronPath, ['.'], {
  env,
  cwd,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code != null ? code : 0));

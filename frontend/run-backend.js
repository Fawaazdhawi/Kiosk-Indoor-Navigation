/* global process */
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

const isWin = os.platform() === 'win32';
// Gunakan path venv jika ada, jika tidak gunakan 'python' dari PATH
const venvPython = path.resolve(__dirname, isWin ? '../venv/Scripts/python.exe' : '../venv/bin/python');
const pythonExe = fs.existsSync(venvPython) ? venvPython : 'python';
const backendDir = path.resolve(__dirname, '../backend');

console.log('Menjalankan backend dengan Python:', pythonExe);

const child = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--reload'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: false
});

child.on('error', (err) => {
  console.warn('Peringatan: Backend Python belum siap / venv belum dibuat:', err.message);
  console.warn('Frontend tetap berjalan normal.');
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.warn('Proses backend selesai dengan kode:', code);
  }
});

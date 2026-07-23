'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');

assert.match(main, /contextIsolation:\s*true/);
assert.match(main, /nodeIntegration:\s*false/);
assert.match(main, /sandbox:\s*true/);
assert.match(main, /webSecurity:\s*true/);
assert.match(main, /setPermissionRequestHandler/);
assert.match(main, /setWindowOpenHandler/);
assert.doesNotMatch(preload, /exposeInMainWorld\([^,]+,\s*ipcRenderer/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /object-src 'none'/);

console.log('desktop security tests passed');

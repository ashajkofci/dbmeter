'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
const releaseWorkflow = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert.match(main, /contextIsolation:\s*true/);
assert.match(main, /nodeIntegration:\s*false/);
assert.match(main, /sandbox:\s*true/);
assert.match(main, /webSecurity:\s*true/);
assert.match(main, /setPermissionRequestHandler/);
assert.match(main, /setWindowOpenHandler/);
assert.doesNotMatch(preload, /exposeInMainWorld\([^,]+,\s*ipcRenderer/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /object-src 'none'/);
assert.equal(packageManifest.build.mac.hardenedRuntime, true);
assert.equal(packageManifest.build.mac.notarize, true);
assert.equal(packageManifest.build.win.signAndEditExecutable, true);
assert.match(releaseWorkflow, /workflow_dispatch:/);
assert.match(releaseWorkflow, /environment: release-signing/);
assert.match(releaseWorkflow, /Require Windows signing credentials/);
assert.match(releaseWorkflow, /Require Apple signing and notarization credentials/);
assert.match(releaseWorkflow, /Get-AuthenticodeSignature/);
assert.match(releaseWorkflow, /xcrun stapler validate/);
assert.match(releaseWorkflow, /-UNSIGNED/);
assert.match(releaseWorkflow, /--prerelease/);
assert.match(releaseWorkflow, /No self-signed certificate was used/);
assert.match(releaseWorkflow, /Remove-Item Env:CSC_LINK/);
assert.match(releaseWorkflow, /unset CSC_LINK/);
assert.match(releaseWorkflow, /--config\.win\.signExecutable=false/);
assert.equal(packageManifest.build.compression, 'normal');
assert.doesNotMatch(releaseWorkflow, /uses:\s+\S+@v\d/);

console.log('desktop security tests passed');

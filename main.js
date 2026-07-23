'use strict';

const path = require('node:path');
const { app, BrowserWindow, ipcMain, net, session } = require('electron');

const REW_ORIGIN = 'http://127.0.0.1:4735';
const MAX_RESPONSE_BYTES = 64 * 1024;
const ALLOWED_REQUESTS = new Map([
    ['GET /spl-meter/commands', false],
    ['GET /spl-meter/1/levels', false],
    ['PUT /spl-meter/1/configuration', true],
    ['POST /spl-meter/1/command', true]
]);

let mainWindow = null;

function validateRewRequest(request) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
        throw new Error('Invalid REW request');
    }

    const method = typeof request.method === 'string' ? request.method.toUpperCase() : 'GET';
    const requestPath = request.path;
    const key = `${method} ${requestPath}`;

    if (!ALLOWED_REQUESTS.has(key)) {
        throw new Error('REW request is not allowed');
    }

    const expectsBody = ALLOWED_REQUESTS.get(key);
    if (expectsBody !== (request.body !== undefined)) {
        throw new Error(expectsBody ? 'A request body is required' : 'A request body is not allowed');
    }

    const serializedBody = expectsBody ? JSON.stringify(request.body) : undefined;
    if (serializedBody && Buffer.byteLength(serializedBody, 'utf8') > 4096) {
        throw new Error('REW request body is too large');
    }

    return { method, path: requestPath, serializedBody };
}

async function requestRew(request) {
    const validated = validateRewRequest(request);
    const response = await net.fetch(`${REW_ORIGIN}${validated.path}`, {
        method: validated.method,
        headers: {
            Accept: 'application/json',
            ...(validated.serializedBody ? { 'Content-Type': 'application/json' } : {})
        },
        body: validated.serializedBody,
        redirect: 'error',
        signal: AbortSignal.timeout(2500)
    });

    if (!response.ok) {
        throw new Error(`REW returned HTTP ${response.status}`);
    }

    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
        throw new Error('REW response is too large');
    }

    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        throw new Error('REW returned invalid JSON');
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 760,
        minWidth: 700,
        minHeight: 600,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#0d1220',
        title: 'Acro dB Meter',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            devTools: !app.isPackaged
        }
    });

    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
    mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));

    ipcMain.handle('rew:request', (event, request) => {
        if (!mainWindow || event.sender !== mainWindow.webContents) {
            throw new Error('Untrusted REW request');
        }
        return requestRew(request);
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

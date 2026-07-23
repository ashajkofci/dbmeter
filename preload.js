'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rewApi', Object.freeze({
    request: (request) => ipcRenderer.invoke('rew:request', request)
}));

contextBridge.exposeInMainWorld('desktopApi', Object.freeze({
    onFullScreenChange: (callback) => {
        if (typeof callback !== 'function') {
            throw new TypeError('Full-screen listener must be a function');
        }

        const listener = (_event, isFullScreen) => callback(Boolean(isFullScreen));
        ipcRenderer.on('window:full-screen-changed', listener);
        return () => ipcRenderer.removeListener('window:full-screen-changed', listener);
    }
}));

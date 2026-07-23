'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rewApi', Object.freeze({
    request: (request) => ipcRenderer.invoke('rew:request', request)
}));

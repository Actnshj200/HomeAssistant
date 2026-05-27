// preload.js — runs in a privileged context before the renderer page loads.
// Currently a no-op stub while nodeIntegration is enabled (see index.js).
// When nodeIntegration is eventually disabled, expose APIs here via contextBridge:
//
//   const { contextBridge, ipcRenderer } = require('electron');
//   contextBridge.exposeInMainWorld('api', {
//     sendPrompt: (prompt) => ipcRenderer.invoke('sendPrompt', prompt),
//   });

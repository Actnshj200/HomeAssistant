require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const axios = require('axios');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // NOTE: nodeIntegration + contextIsolation:false are required while renderer
      // scripts use require() directly. Future refactor should use a preload script
      // with contextBridge to expose only the needed APIs, then flip these flags.
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      preload: require('path').join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('sendPrompt', async (event, prompt) => {
  try {
    const response = await axios.post('https://your-llm-api-endpoint.com', {
      prompt,
    });
    event.reply('llmResponse', response.data);
  } catch (error) {
    console.error(error);
    event.reply('llmResponse', { error: 'An error occurred. Please try again.' });
  }
});
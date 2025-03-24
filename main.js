const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// Initialize store for settings
const store = new Store();

// Keep a global reference to prevent garbage collection
let mainWindow;

// Create the browser window
function createWindow() {
  // Create an empty menu template
  const template = [];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      worldSafeExecuteJavaScript: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 20 },
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: true
  });

  // 设置会话安全选项
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // 拒绝所有不必要的权限请求
    const allowedPermissions = ['clipboard-read', 'clipboard-write', 'media'];
    callback(allowedPermissions.includes(permission));
  });

  // Load the index.html file
  const startUrl = isDev 
    ? 'http://localhost:3002' 
    : `file://${path.join(__dirname, 'build', 'index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
function setupIPC() {
  // Handle translation requests from renderer
  ipcMain.handle('translate-text', async (event, text) => {
    console.log('IPC: translate-text request received from renderer');
    if (mainWindow) {
      mainWindow.webContents.send('translate-text', text);
      console.log('IPC: text forwarded to main window for translation');
    }
    return true;
  });
  
  // Handle opening external links
  ipcMain.handle('open-external', async (event, url) => {
    console.log(`IPC: Opening external URL: ${url}`);
    return shell.openExternal(url);
  });
  
  // Handle app settings
  ipcMain.handle('get-setting', (event, key) => {
    const value = store.get(key);
    console.log(`IPC: get-setting '${key}' returned:`, value);
    return value;
  });
  
  ipcMain.handle('set-setting', (event, key, value) => {
    console.log(`IPC: set-setting '${key}' to:`, value);
    store.set(key, value);
    return true;
  });
}

// App ready event
app.whenReady().then(() => {
  console.log('App ready, initializing...');
  
  console.log(`Platform: ${process.platform}, Arch: ${process.arch}, Node version: ${process.versions.node}, Electron: ${process.versions.electron}`);
  
  // Create main window first
  createWindow();
  
  // Setup IPC handlers
  setupIPC();
  
  console.log('App initialization complete');
  
  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle permission requests (especially important for macOS)
app.on('will-finish-launching', () => {
  // macOS specific - handle open-file and open-url events
  app.on('open-file', (event, path) => {
    event.preventDefault();
    // Handle file open if needed
  });
  
  app.on('open-url', (event, url) => {
    event.preventDefault();
    // Handle URL scheme if needed
  });
});

// Auto updater events
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', 'checking');
  }
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', 'available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', 'not-available');
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', 'progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', 'downloaded', info);
  }
}); 
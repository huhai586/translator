const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, clipboard, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');

// Initialize store for settings
const store = new Store();

// Keep a global reference to prevent garbage collection
let mainWindow;
let tray = null;

// Triple-click detection variables
let copyCount = 0;
let lastCopyTime = 0;
let clipboardPollingInterval = null;

// Create the browser window
function createWindow() {
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

  // Create system tray icon
  try {
    createTray();
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

// Create system tray
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', isDev ? 'icon-dev.png' : 'icon.png');
    // 尝试创建托盘图标
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => mainWindow.show() },
      { type: 'separator' },
      { 
        label: 'Triple-Copy Detection', 
        type: 'checkbox', 
        checked: store.get('tripleClickEnabled', true), 
        click: (menuItem) => {
          store.set('tripleClickEnabled', menuItem.checked);
        }
      },
      { 
        label: 'Triple-Copy Sensitivity', 
        submenu: [
          { 
            label: 'Very Fast (0.8 seconds)', 
            type: 'radio', 
            checked: store.get('tripleCopyDelay', 1200) === 800,
            click: () => store.set('tripleCopyDelay', 800) 
          },
          { 
            label: 'Fast (1 second)', 
            type: 'radio', 
            checked: store.get('tripleCopyDelay', 1200) === 1000,
            click: () => store.set('tripleCopyDelay', 1000) 
          },
          { 
            label: 'Medium (1.2 seconds)', 
            type: 'radio', 
            checked: store.get('tripleCopyDelay', 1200) === 1200,
            click: () => store.set('tripleCopyDelay', 1200) 
          },
          { 
            label: 'Slow (1.5 seconds)', 
            type: 'radio', 
            checked: store.get('tripleCopyDelay', 1200) === 1500,
            click: () => store.set('tripleCopyDelay', 1500) 
          }
        ]
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    
    tray.setToolTip('CrossLingua');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  } catch (error) {
    console.error('Error creating tray icon:', error);
    // 如果创建托盘图标失败，可以尝试继续运行但不创建托盘图标
    // 或者使用应用程序默认图标
  }
}

// Setup clipboard monitoring with hybrid polling approach
function setupClipboardMonitor() {
  console.log('Setting up HYBRID monitoring system (clipboard polling + window key events)');
  
  // 清理旧状态
  copyCount = 0;
  lastCopyTime = 0;
  
  // 清理任何现有的轮询间隔
  if (clipboardPollingInterval) {
    clearInterval(clipboardPollingInterval);
    clipboardPollingInterval = null;
  }
  
  // 检查是否启用了三击复制功能
  const tripleClickEnabled = store.get('tripleClickEnabled', true);
  console.log(`Triple-click detection is ${tripleClickEnabled ? 'enabled' : 'disabled'}`);
  
  if (!tripleClickEnabled) {
    console.log('Triple-click detection is disabled, skipping monitor setup');
    return;
  }

  // 保存当前剪贴板内容，用于后续监测变化
  let lastClipboardContent = clipboard.readText();
  console.log(`Initial clipboard content: ${lastClipboardContent.substring(0, 20)}${lastClipboardContent.length > 20 ? '...' : ''}`);
  
  // 取消注册所有全局快捷键，确保不干扰系统复制
  unregisterAllShortcuts();
  console.log('Unregistered all global shortcuts to preserve system copy functionality');
  
  // 方法1: 使用剪贴板轮询检测复制操作
  const pollingFrequency = 100; // 毫秒
  console.log(`Setting up clipboard polling: ${pollingFrequency}ms interval`);
  
  clipboardPollingInterval = setInterval(() => {
    try {
      const currentContent = clipboard.readText();
      if (currentContent !== lastClipboardContent) {
        console.log(`📋 Clipboard content changed (detected via polling)`);
        console.log(`New content preview: "${currentContent.substring(0, 20)}${currentContent.length > 20 ? '...' : ''}"`);
        
        lastClipboardContent = currentContent;
        detectTripleAction(); // 当剪贴板内容变化时，认为是一次Ctrl+C操作
      }
    } catch (err) {
      console.error('Error polling clipboard:', err);
    }
  }, pollingFrequency);
  
  // 方法2: 监听主窗口上的键盘事件
  if (mainWindow) {
    console.log('Setting up window-level key event listeners');
    
    // 当主窗口获得焦点时，可以捕获其中的键盘事件
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // 检测Ctrl+C组合键 (C的keyCode为67)
      if (input.control && input.key === 'c' && !input.alt && !input.meta && !input.shift) {
        console.log('📋 Ctrl+C detected (via window event)');
        // 这里不阻止事件，允许系统复制操作继续
        
        // 在复制操作后稍微延迟以检测剪贴板变化
        setTimeout(() => {
          try {
            const newContent = clipboard.readText();
            if (newContent !== lastClipboardContent) {
              console.log('✅ Copy confirmed: clipboard content changed');
              lastClipboardContent = newContent;
              detectTripleAction();
            }
          } catch (err) {
            console.error('Error checking clipboard after key event:', err);
          }
        }, 50);
      }
    });
    
    console.log('Window-level key event listeners established');
  } else {
    console.warn('⚠️ Main window not available for key event listening');
  }
  
  // 方法3: 提供一个备选快捷键，直接激活应用
  try {
    // 注册Alt+C作为显式触发器
    const altCRegistered = globalShortcut.register('Alt+C', () => {
      console.log('⚡ Alt+C detected - direct app activation');
      activateApp(); // 直接激活应用，不走三连击检测
      return false; // 不阻止可能的系统行为
    });
    
    console.log(`Alt+C helper shortcut registered: ${altCRegistered ? 'Success' : 'Failed'}`);
  } catch (error) {
    console.error('Failed to register Alt+C helper shortcut:', error);
  }
  
  console.log('🔄 Hybrid monitoring system initialized (polling + window events + Alt+C)');
  console.log('📝 NOTE: System copy (Ctrl+C) is preserved while detection remains active');
}

// 统一的三次复制检测函数
function detectTripleAction() {
  const now = Date.now();
  const tripleCopyDelay = store.get('tripleCopyDelay', 1200);
  
  // 如果是第一次复制操作，或者超过了检测窗口时间
  if (copyCount === 0 || now - lastCopyTime > tripleCopyDelay) {
    copyCount = 1;
    lastCopyTime = now;
    console.log('1️⃣ First copy detected, starting count');
  } else {
    // 在检测窗口内的后续复制操作
    copyCount++;
    console.log(`${copyCount === 2 ? '2️⃣' : '3️⃣'} Copy count: ${copyCount} (within ${tripleCopyDelay}ms window)`);
    
    // 检测到三次复制
    if (copyCount >= 3) {
      console.log('🚀 TRIPLE COPY DETECTED! Activating application...');
      copyCount = 0; // 重置计数
      activateApp();
    }
  }
}

// 激活应用并处理剪贴板内容
function activateApp() {
  if (!mainWindow) {
    console.error('Cannot activate app: No main window');
    return;
  }
  
  try {
    console.log(`Activating app on triple Ctrl+C press`);
    
    // 激活窗口，确保在前台显示
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    
    mainWindow.show();
    mainWindow.focus();
    
    // 显著增强Windows上的窗口激活方法
    if (process.platform === 'win32') {
      console.log('Using aggressive window activation for Windows');
      
      // 先将窗口设为顶层
      mainWindow.setAlwaysOnTop(true);
      
      // 使用闪烁吸引注意
      mainWindow.flashFrame(true);
      
      // 确保窗口在前台并获得焦点
      mainWindow.moveTop();
      mainWindow.focus();
      
      // 延迟后重置顶层状态和闪烁
      setTimeout(() => {
        mainWindow.setAlwaysOnTop(false);
        mainWindow.flashFrame(false);
      }, 500);
      
      // 如果仍未获得焦点，尝试再次获取
      if (!mainWindow.isFocused()) {
        setTimeout(() => {
          mainWindow.moveTop();
          mainWindow.focus();
        }, 100);
      }
    } 
    // macOS特定方法
    else if (process.platform === 'darwin') {
      app.dock.show();
      app.focus({ steal: true });
    }
    
    // 延迟后读取剪贴板内容
    setTimeout(() => {
      try {
        // 这里我们从剪贴板读取文本，因为我们的Ctrl+C拦截了系统复制，需要自己实现读取
        const clipboardText = clipboard.readText() || '';
        
        if (clipboardText.trim()) {
          console.log(`Reading clipboard content: ${clipboardText.length} chars`);
          if (clipboardText.length < 100) {
            console.log(`Clipboard content: "${clipboardText}"`);
          } else {
            console.log(`Clipboard preview: "${clipboardText.substring(0, 100)}..."`);
          }
          
          // 发送剪贴板内容给渲染进程
          console.log('Sending clipboard content to renderer process...');
          mainWindow.webContents.send('translate-text', clipboardText);
        } else {
          console.log('No valid clipboard content detected');
        }
      } catch (clipboardError) {
        console.error('Error reading clipboard:', clipboardError);
      }
    }, 200); // 给窗口一点时间来获得焦点，然后再读取剪贴板
    
  } catch (error) {
    console.error('Error activating application:', error);
  }
}

// Handle clipboard content changes
function handleClipboardChange() {
  // 移除此遗留函数，不再使用
  console.log('Legacy clipboard handler called - this function is deprecated');
}

// IPC handlers
function setupIPC() {
  // Handle translation requests from renderer
  ipcMain.handle('translate-text', async (event, text) => {
    console.log('IPC: translate-text request received from renderer');
    // This is a pass-through - actual translation happens in renderer
    // We just send the event back to the window
    if (mainWindow) {
      mainWindow.webContents.send('translate-text', text);
      console.log('IPC: text forwarded to main window for translation');
    }
    return true;
  });
  
  // Handle clipboard read request
  ipcMain.handle('get-clipboard-text', () => {
    try {
      const text = clipboard.readText() || '';
      console.log(`IPC: get-clipboard-text request returned ${text.length} characters`);
      return text;
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
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

// Check if clipboard monitoring is working
function testClipboardMonitoring() {
  console.log('========== KEYBOARD SHORTCUT MONITOR TEST ==========');
  
  // 检查三击复制功能设置
  console.log('Triple-Press Detection enabled:', store.get('tripleClickEnabled', true));
  console.log('Triple-Press Delay (ms):', store.get('tripleCopyDelay', 1200));
  
  // 检查快捷键注册状态
  console.log('Ctrl+C shortcut registered:', globalShortcut.isRegistered('CommandOrControl+C'));
  console.log('Toggle visibility shortcut registered:', globalShortcut.isRegistered('CommandOrControl+Shift+T'));
  
  // 打印平台特定信息
  console.log(`Platform: ${process.platform}`);
  console.log(`Ctrl+C monitoring active: ${globalShortcut.isRegistered('CommandOrControl+C')}`);
  
  console.log('=================================================');
}

// App ready event
app.whenReady().then(() => {
  console.log('App ready, initializing...');
  
  // 确保没有残留的快捷键注册
  unregisterAllShortcuts();
  console.log('Cleaned up all shortcuts for fresh start');
  
  console.log(`Platform: ${process.platform}, Arch: ${process.arch}, Node version: ${process.versions.node}, Electron: ${process.versions.electron}`);
  
  // Create main window first
  createWindow();
  
  // Setup IPC handlers
  setupIPC();
  
  // Now setup clipboard monitoring
  setupClipboardMonitor();
  
  // Test monitoring capabilities after a short delay
  setTimeout(testClipboardMonitoring, 2000);
  
  // 只注册可见性切换快捷键，不再注册Ctrl+C
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    console.log('Show/hide app shortcut triggered (Ctrl+Shift+T)');
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
        console.log('App hidden via shortcut');
      } else {
        mainWindow.show();
        mainWindow.focus();
        console.log('App shown via shortcut');
      }
    }
  });
  
  // 应急检查：确保Ctrl+C未被占用
  setTimeout(() => {
    ensureCtrlCIsAvailable();
  }, 5000);
  
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

// Clean up before app quits
app.on('will-quit', () => {
  // 确保清理所有全局快捷键
  console.log('Cleaning up before app quit');
  
  // 清理轮询
  if (clipboardPollingInterval) {
    clearInterval(clipboardPollingInterval);
    clipboardPollingInterval = null;
    console.log('Clipboard polling stopped');
  }
  
  // 取消注册所有全局快捷键
  globalShortcut.unregisterAll();
  console.log('All global shortcuts unregistered');
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

// Alternative clipboard monitor when global shortcuts can't be registered
function setupFallbackClipboardMonitor() {
  // 移除此备用方法，使用主要的轮询方法
  console.log('Fallback clipboard monitor is deprecated');
  return null;
}

// Register global shortcuts for detecting clipboard operations
function registerClipboardShortcuts() {
  // 这个函数已经不再单独使用，由setupClipboardMonitor直接调用相关功能
  console.log('Legacy registerClipboardShortcuts called - functionality moved elsewhere');
  return false;
}

// Handle copy shortcut press - now more useful for direct key detection
function onCopyShortcutPressed() {
  console.log('Copy shortcut directly detected');
  onCopyKeyDetected();
}

// Unregister all shortcuts to avoid conflicts
function unregisterAllShortcuts() {
  try {
    // 确保所有快捷键都被取消注册，特别关注Ctrl+C
    console.log('Unregistering all shortcuts including Ctrl+C');
    
    // 先直接全面卸载所有快捷键
    globalShortcut.unregisterAll();
    
    // 检查是否彻底清除了Ctrl+C
    if (!globalShortcut.isRegistered('CommandOrControl+C')) {
      console.log('Confirmed: Ctrl+C is NOT registered as global shortcut');
    } else {
      // 如果仍在注册状态，尝试单独卸载
      try {
        globalShortcut.unregister('CommandOrControl+C');
        console.log('Unregistered Ctrl+C shortcut specifically');
      } catch (ctrlCError) {
        console.error('Error unregistering Ctrl+C specifically:', ctrlCError);
      }
      
      // 再次确认
      if (globalShortcut.isRegistered('CommandOrControl+C')) {
        console.error('WARNING: Unable to unregister Ctrl+C! System copy operations may be affected.');
      }
    }
  } catch (error) {
    console.error('Error unregistering shortcuts:', error);
  }
}

// 确保复制监听系统正常运行
function ensureCtrlCIsAvailable() {
  console.log('Running emergency check for clipboard monitoring system...');
  
  // 检查剪贴板轮询是否正常运行
  const pollingActive = clipboardPollingInterval !== null;
  console.log(`Clipboard polling status: ${pollingActive ? 'Active' : 'Not active'}`);
  
  // 如果轮询不活跃，尝试重新启动
  if (!pollingActive) {
    console.log('Attempting to restart clipboard polling...');
    try {
      // 保存当前剪贴板内容
      let currentClipboardContent = clipboard.readText();
      
      clipboardPollingInterval = setInterval(() => {
        try {
          const newContent = clipboard.readText();
          if (newContent !== currentClipboardContent) {
            console.log(`📋 Clipboard change detected (emergency polling)`);
            currentClipboardContent = newContent;
            detectTripleAction();
          }
        } catch (err) {
          console.error('Error in emergency clipboard polling:', err);
        }
      }, 200); // 使用稍长的间隔以减少性能开销
      
      console.log('✅ Emergency clipboard polling started');
    } catch (error) {
      console.error('Failed to establish emergency clipboard polling:', error);
    }
  }
  
  // 检查Alt+C辅助快捷键
  const altCAvailable = globalShortcut.isRegistered('Alt+C');
  console.log(`Alt+C shortcut status: ${altCAvailable ? 'Registered' : 'Not registered'}`);
  
  // 如果Alt+C未注册，尝试注册
  if (!altCAvailable) {
    console.log('Registering Alt+C helper shortcut...');
    
    try {
      const altCRegistered = globalShortcut.register('Alt+C', () => {
        console.log('⚡ Alt+C detected (emergency handler)');
        activateApp(); // 直接激活应用
        return false; // 不阻止系统默认行为
      });
      
      console.log(`Emergency Alt+C registration: ${altCRegistered ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Failed to register Alt+C helper shortcut:', error);
    }
  }
  
  // 确保没有Ctrl+C全局快捷键占用
  if (globalShortcut.isRegistered('CommandOrControl+C')) {
    console.log('⚠️ Ctrl+C is registered - unregistering to restore system copy');
    globalShortcut.unregister('CommandOrControl+C');
    console.log('✅ Unregistered Ctrl+C to ensure system copy works');
  }
  
  console.log('📝 USAGE: Use Ctrl+C normally for copying. Three consecutive copies will trigger the app. Alt+C is available as a direct trigger.');
} 
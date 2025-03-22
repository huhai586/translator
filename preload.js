const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    // Translation functions
    translateText: (text) => ipcRenderer.invoke('translate-text', text),
    
    // Clipboard access
    getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
    
    // App management
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Settings management
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
    
    // Event listeners
    on: (channel, func) => {
      // Whitelist channels to listen to
      const validChannels = [
        'translate-text', 
        'update-status'
      ];
      
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
        
        // Return function to remove listener
        return () => {
          ipcRenderer.removeListener(channel, func);
        };
      }
      
      return null;
    }
  }
); 
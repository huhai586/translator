import React, { useEffect, useState } from 'react';
import { 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme, 
  useMediaQuery,
  Snackbar,
  Alert
} from '@mui/material';

import TranslationPanel from './components/TranslationPanel';
import SourcePanel from './components/SourcePanel';
import Header from './components/Header';
import SettingsDialog from './components/SettingsDialog';
import AboutDialog from './components/AboutDialog';
import LanguageSelector from './components/LanguageSelector';
import translationService from './services/TranslationService';

// Declare global interface for TypeScript
declare global {
  interface Window {
    electron: {
      translateText: (text: string) => Promise<boolean>;
      openExternal: (url: string) => Promise<boolean>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<boolean>;
      on: (channel: string, func: (...args: any[]) => void) => () => void;
      getClipboardText: () => Promise<string>;
    };
  }
}

const App: React.FC = () => {
  // State
  const [sourceText, setSourceText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  
  // 语言设置
  const [sourceLanguage, setSourceLanguage] = useState<string>('zh');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Theme preference
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState<boolean>(prefersDarkMode);

  // Theme setup
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  // 处理语言切换
  const handleSwapLanguages = () => {
    // 只有当源语言不是自动检测时才交换
    if (sourceLanguage !== 'auto') {
      const temp = sourceLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(temp);
      
      // 如果有文本，则重新翻译
      if (sourceText.trim() && translatedText) {
        setSourceText(translatedText);
        handleTranslate(translatedText);
      }
    }
  };

  // Handle translation requests
  const handleTranslate = async (text: string) => {
    if (!text.trim()) return;
    
    setSourceText(text);
    setIsTranslating(true);
    setTranslatedText('Translating...');
    
    try {
      // 更新翻译服务的语言设置
      await window.electron.setSetting('sourceLanguage', sourceLanguage);
      await window.electron.setSetting('targetLanguage', targetLanguage);
      
      // 强制重新加载设置并检查服务可用性
      const canTranslate = await translationService.reloadSettings();
      
      // Check if translation service is available
      if (!canTranslate) {
        setTranslatedText('No translation API keys configured. Please add API keys in settings.');
        showNotification('Please add OpenAI or Gemini API key in settings to use translation.', 'warning');
        setIsSettingsOpen(true);
        return;
      }

      // Translate the text
      const result = await translationService.translate(text);
      
      // Set the translated text
      setTranslatedText(result.translatedText);
      
      // Show provider info
      showNotification(`Translated with ${result.provider === 'openai' ? 'OpenAI' : 'Google Gemini'} (${Math.round(result.responseTime / 10) / 100}s)`, 'success');
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('Translation failed. Please try again.');
      showNotification('Translation service error. Please check your connection and API keys.', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Show notification
  const showNotification = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  // Handle settings dialog close
  const handleSettingsClose = async () => {
    setIsSettingsOpen(false);
    // 强制重新加载翻译服务设置
    await translationService.reloadSettings();
  };

  // Load settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedDarkMode = await window.electron.getSetting('darkMode');
        if (savedDarkMode !== undefined) {
          setDarkMode(savedDarkMode);
        }
        
        // 加载语言设置
        const savedSourceLanguage = await window.electron.getSetting('sourceLanguage');
        if (savedSourceLanguage && savedSourceLanguage !== 'auto') {
          setSourceLanguage(savedSourceLanguage);
        }
        
        const savedTargetLanguage = await window.electron.getSetting('targetLanguage');
        if (savedTargetLanguage) {
          setTargetLanguage(savedTargetLanguage);
        }
        
        // Initialize translation service
        await translationService.loadSettings();
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Setup event listener for translation requests from main process
  useEffect(() => {
    console.log('Setting up translate-text event listener (non-blocking mode)');
    
    const removeListener = window.electron.on('translate-text', async (text: string) => {
      console.log('==== Translate request received from main process ====');
      let clipboardText = text;
      
      try {
        // 记录接收到的文本信息
        if (text && text.trim()) {
          console.log(`Received text: ${text.length} chars`);
          if (text.length < 100) {
            console.log(`Full text: "${text}"`);
          } else {
            console.log(`Text preview: "${text.substring(0, 100)}..."`);
          }
        } else {
          console.log('Warning: Received empty or invalid text');
        }
        
        // 检查接收到的文本是否有效
        if (!isValidText(text)) {
          console.log('Text validation failed - attempting fallback retrieval methods');
          
          try {
            // 尝试使用Electron API获取剪贴板内容
            const electronText = await window.electron.getClipboardText();
            
            if (isValidText(electronText)) {
              clipboardText = electronText;
              console.log(`Retrieved valid text via IPC: ${electronText.length} chars`);
            } else {
              console.log('IPC retrieval returned invalid text - trying browser API');
              
              // 浏览器API备用方案
              try {
                const browserText = await navigator.clipboard.readText();
                if (isValidText(browserText)) {
                  clipboardText = browserText;
                  console.log(`Retrieved valid text via browser API: ${browserText.length} chars`);
                } else {
                  console.log('Browser API retrieval also returned invalid text');
                }
              } catch (clipboardError) {
                console.error('Browser clipboard API access error:', clipboardError);
              }
            }
          } catch (error) {
            console.error('IPC clipboard retrieval error:', error);
          }
        }
        
        // 最终验证
        if (!isValidText(clipboardText)) {
          console.error('All clipboard retrieval methods failed');
          showNotification('无法获取有效的剪贴板内容，请重新复制后再试', 'error');
          return;
        }
        
        // 处理文本
        console.log('Processing clipboard content for translation...');
        const cleanText = removeDuplicateText(clipboardText);
        
        if (cleanText !== clipboardText) {
          console.log(`Text cleaned: ${clipboardText.length} chars → ${cleanText.length} chars`);
        }
        
        console.log(`Text ready for translation (${cleanText.length} chars)`);
        
        // 设置输入框内容并翻译
        setSourceText(cleanText);
        handleTranslate(cleanText);
        
        // 通知用户
        showNotification('剪贴板文本已获取，正在翻译...', 'info');
        console.log('==== Translate request processing complete ====');
      } catch (error) {
        console.error('Error in clipboard processing flow:', error);
        showNotification('处理剪贴板内容时出错', 'error');
      }
    });
    
    // 清理
    return () => {
      console.log('Removing translate-text event listener');
      if (removeListener) removeListener();
    };
  }, [sourceLanguage, targetLanguage]);

  // 帮助函数：验证文本是否有效
  const isValidText = (text: string | undefined | null): boolean => {
    if (!text) return false;
    if (text.trim().length < 2) return false;
    
    // 检查是否为UUID格式
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      return false;
    }
    
    return true;
  };

  // 帮助函数：检测和移除重复内容
  const removeDuplicateText = (text: string): string => {
    if (!isValidText(text)) return '';
    
    // 删除任何潜在的空白开头或结尾
    const trimmedText = text.trim();
    
    // 检查完全重复的文本
    const halfLength = Math.floor(trimmedText.length / 2);
    for (let i = halfLength; i >= 10; i--) {
      const firstHalf = trimmedText.substring(0, i);
      const secondHalf = trimmedText.substring(i, i + i);
      
      if (firstHalf === secondHalf) {
        console.log('Exact duplicate text pattern detected, keeping only first part');
        return firstHalf;
      }
    }
    
    // 删除连续重复的行
    const lines = trimmedText.split(/\r?\n/);
    
    if (lines.length > 1) {
      const uniqueLines: string[] = [];
      let prevLine = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && trimmedLine !== prevLine) {
          uniqueLines.push(line);
          prevLine = trimmedLine;
        }
      }
      
      if (uniqueLines.length < lines.length) {
        console.log(`Removed ${lines.length - uniqueLines.length} duplicate lines`);
        return uniqueLines.join('\n');
      }
    }
    
    // 查找段落级别的重复
    const paragraphs = trimmedText.split(/\n\s*\n/);
    
    // 如果只有一个段落，不需要段落级别的去重
    if (paragraphs.length <= 1) return trimmedText;
    
    const uniqueParagraphs: string[] = [];
    const seen = new Set<string>();
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (trimmedParagraph && !seen.has(trimmedParagraph)) {
        seen.add(trimmedParagraph);
        uniqueParagraphs.push(paragraph);
      }
    }
    
    // 如果去重后的段落数量减少了，返回去重后的文本
    if (uniqueParagraphs.length < paragraphs.length) {
      console.log(`Removed ${paragraphs.length - uniqueParagraphs.length} duplicate paragraphs`);
      return uniqueParagraphs.join('\n\n');
    }
    
    // 如果没有发现任何需要清理的内容，返回原始的去除首尾空格的文本
    return trimmedText;
  };

  // Listen for update events
  useEffect(() => {
    const removeListener = window.electron.on('update-status', (status: string, data?: any) => {
      switch (status) {
        case 'available':
          showNotification('An update is available and will be downloaded automatically.', 'info');
          break;
        case 'downloaded':
          showNotification('Update downloaded. Restart the app to apply it.', 'success');
          break;
        case 'error':
          showNotification('Update error: ' + (data?.message || 'Unknown error'), 'error');
          break;
      }
    });
    
    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  // Save dark mode preference when it changes
  useEffect(() => {
    window.electron.setSetting('darkMode', darkMode);
  }, [darkMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Header 
          darkMode={darkMode} 
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
        />
        
        {/* 顶部语言选择器容器 */}
        <Box sx={{ 
          px: 2, 
          pt: 2, 
          pb: 0,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Box sx={{ 
            width: '100%', 
            maxWidth: '800px',
          }}>
            <LanguageSelector
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onSourceLanguageChange={setSourceLanguage}
              onTargetLanguageChange={setTargetLanguage}
              onSwapLanguages={handleSwapLanguages}
            />
          </Box>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexGrow: 1,
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden'
        }}>
          <SourcePanel 
            text={sourceText} 
            onTextChange={setSourceText} 
            onTranslate={handleTranslate}
            isTranslating={isTranslating}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            onSourceLanguageChange={setSourceLanguage}
            onTargetLanguageChange={setTargetLanguage}
            onSwapLanguages={handleSwapLanguages}
          />
          
          <TranslationPanel 
            text={translatedText} 
            isLoading={isTranslating}
          />
        </Box>
      </Box>
      
      <SettingsDialog 
        open={isSettingsOpen} 
        onClose={handleSettingsClose}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />
      
      <AboutDialog
        open={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
      
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default App; 
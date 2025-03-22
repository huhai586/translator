import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
  FormGroup,
  Box,
  TextField,
  MenuItem,
  Alert
} from '@mui/material';
import translationService from '../services/TranslationService';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

// Language options
const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' }
];

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  darkMode,
  onToggleDarkMode
}) => {
  // State for settings
  const [tripleClickEnabled, setTripleClickEnabled] = useState<boolean>(true);
  const [tripleCopyDelay, setTripleCopyDelay] = useState<number>(1500);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    gemini: ''
  });
  const [preferredModel, setPreferredModel] = useState<string>('gpt-3.5-turbo');
  const [sourceLanguage, setSourceLanguage] = useState<string>('auto');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [keyStatus, setKeyStatus] = useState({
    openai: false,
    gemini: false
  });

  // Load settings on dialog open
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  // Load settings from electron store
  const loadSettings = async () => {
    try {
      const tripleClick = await window.electron.getSetting('tripleClickEnabled');
      if (tripleClick !== undefined) {
        setTripleClickEnabled(tripleClick);
      }
      
      const copyDelay = await window.electron.getSetting('tripleCopyDelay');
      if (copyDelay !== undefined) {
        setTripleCopyDelay(copyDelay);
      }
      
      const openaiKey = await window.electron.getSetting('openaiApiKey');
      const geminiKey = await window.electron.getSetting('geminiApiKey');
      
      setApiKeys({
        openai: openaiKey || '',
        gemini: geminiKey || ''
      });
      
      setKeyStatus({
        openai: !!openaiKey,
        gemini: !!geminiKey
      });
      
      const model = await window.electron.getSetting('preferredModel');
      if (model) {
        setPreferredModel(model);
      }
      
      const sourceLang = await window.electron.getSetting('sourceLanguage');
      if (sourceLang) {
        setSourceLanguage(sourceLang);
      }
      
      const targetLang = await window.electron.getSetting('targetLanguage');
      if (targetLang) {
        setTargetLanguage(targetLang);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save settings
  const handleSave = async () => {
    try {
      await window.electron.setSetting('tripleClickEnabled', tripleClickEnabled);
      await window.electron.setSetting('tripleCopyDelay', tripleCopyDelay);
      await window.electron.setSetting('openaiApiKey', apiKeys.openai);
      await window.electron.setSetting('geminiApiKey', apiKeys.gemini);
      await window.electron.setSetting('preferredModel', preferredModel);
      await window.electron.setSetting('sourceLanguage', sourceLanguage);
      await window.electron.setSetting('targetLanguage', targetLanguage);
      
      // 强制重新加载翻译服务设置
      await translationService.reloadSettings();
      
      // 更新按键状态
      setKeyStatus({
        openai: !!apiKeys.openai,
        gemini: !!apiKeys.gemini
      });
      
      console.log('Settings saved and service reloaded', {
        hasOpenAI: !!apiKeys.openai,
        hasGemini: !!apiKeys.gemini
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Handle API key change
  const handleApiKeyChange = (provider: 'openai' | 'gemini', value: string) => {
    setApiKeys({
      ...apiKeys,
      [provider]: value
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" gutterBottom>
          General
        </Typography>
        <FormGroup sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={onToggleDarkMode}
                name="darkMode"
              />
            }
            label="Dark Mode"
          />
          <FormControlLabel
            control={
              <Switch
                checked={tripleClickEnabled}
                onChange={(e) => setTripleClickEnabled(e.target.checked)}
                name="tripleClickEnabled"
              />
            }
            label="Enable Triple-Copy Detection"
          />
          
          <Box sx={{ pl: 4, pt: 1, width: '100%' }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Triple-Copy Sensitivity
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              margin="dense"
              variant="outlined"
              value={tripleCopyDelay}
              onChange={(e) => setTripleCopyDelay(Number(e.target.value))}
              disabled={!tripleClickEnabled}
            >
              <MenuItem value={1000}>Fast (1 second)</MenuItem>
              <MenuItem value={1500}>Medium (1.5 seconds)</MenuItem>
              <MenuItem value={2000}>Slow (2 seconds)</MenuItem>
            </TextField>
            <Typography variant="caption" color="textSecondary">
              How quickly you need to press Ctrl+C (or Cmd+C) three times to activate the app.
            </Typography>
          </Box>
        </FormGroup>

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Translation
        </Typography>
        <Box sx={{ mb: 3 }}>
          <TextField
            select
            fullWidth
            margin="normal"
            variant="outlined"
            label="Source Language"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            select
            fullWidth
            margin="normal"
            variant="outlined"
            label="Target Language"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            {LANGUAGES.filter(lang => lang.code !== 'auto').map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            select
            fullWidth
            margin="normal"
            variant="outlined"
            label="Preferred Model"
            value={preferredModel}
            onChange={(e) => setPreferredModel(e.target.value)}
          >
            <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
            <MenuItem value="gpt-4">GPT-4</MenuItem>
            <MenuItem value="gemini-pro">Gemini Pro</MenuItem>
          </TextField>
        </Box>

        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          API Keys
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Your API keys are stored locally on your device and are never sent to our servers.
        </Alert>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            margin="normal"
            variant="outlined"
            label="OpenAI API Key"
            type="password"
            value={apiKeys.openai}
            onChange={(e) => handleApiKeyChange('openai', e.target.value)}
            helperText={keyStatus.openai ? "API key is set" : "Enter your OpenAI API key"}
          />
          
          <TextField
            fullWidth
            margin="normal"
            variant="outlined"
            label="Google Gemini API Key"
            type="password"
            value={apiKeys.gemini}
            onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
            helperText={keyStatus.gemini ? "API key is set" : "Enter your Google Gemini API key"}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog; 
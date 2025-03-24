import React from 'react';
import { 
  Box, 
  Select, 
  MenuItem, 
  IconButton, 
  SelectChangeEvent, 
  useTheme,
  alpha
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

// 支持的语言列表
const LANGUAGES = {
  'zh': '中文 (简体)',
  'en': '英语',
  'de': '德语',
  'ja': '日语'
};

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  onTargetLanguageChange: (lang: string) => void;
  onSwapLanguages: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLanguage,
  targetLanguage,
  onSourceLanguageChange,
  onTargetLanguageChange,
  onSwapLanguages
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // 处理源语言变化
  const handleSourceLanguageChange = (event: SelectChangeEvent<string>) => {
    const newSourceLang = event.target.value;
    onSourceLanguageChange(newSourceLang);
    
    // 如果源语言是英语，目标语言自动设为中文，反之亦然
    if (newSourceLang === 'en' && targetLanguage === 'en') {
      onTargetLanguageChange('zh');
    } else if (newSourceLang === 'zh' && targetLanguage === 'zh') {
      onTargetLanguageChange('en');
    }
  };
  
  // 处理目标语言变化
  const handleTargetLanguageChange = (event: SelectChangeEvent<string>) => {
    const newTargetLang = event.target.value;
    onTargetLanguageChange(newTargetLang);
    
    // 如果目标语言是英语，源语言自动设为中文，反之亦然
    if (newTargetLang === 'en' && sourceLanguage === 'en') {
      onSourceLanguageChange('zh');
    } else if (newTargetLang === 'zh' && sourceLanguage === 'zh') {
      onSourceLanguageChange('en');
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      width: '100%',
      backgroundColor: isDarkMode ? alpha(theme.palette.background.paper, 0.8) : '#f1f3f4',
      color: theme.palette.text.primary,
      borderRadius: '8px',
      mb: 2,
      py: 1,
      px: 2,
      border: isDarkMode ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
    }}>
      {/* 源语言选择器 */}
      <Select
        value={sourceLanguage}
        onChange={handleSourceLanguageChange}
        variant="standard"
        disableUnderline
        sx={{ 
          minWidth: 120, 
          color: theme.palette.text.primary,
          '& .MuiSelect-select': {
            py: 1,
            pr: 2,
            fontSize: '0.95rem',
            fontWeight: 'medium',
          },
          '& .MuiSelect-icon': {
            color: theme.palette.text.secondary
          }
        }}
      >
        <MenuItem value="zh">{LANGUAGES.zh}</MenuItem>
        <MenuItem value="en">{LANGUAGES.en}</MenuItem>
        <MenuItem value="de">{LANGUAGES.de}</MenuItem>
        <MenuItem value="ja">{LANGUAGES.ja}</MenuItem>
      </Select>
      
      {/* 语言切换按钮 */}
      <IconButton 
        onClick={onSwapLanguages}
        size="small"
        sx={{ 
          mx: 2,
          color: theme.palette.text.secondary,
          backgroundColor: isDarkMode ? alpha(theme.palette.action.hover, 0.1) : undefined,
          '&:hover': {
            backgroundColor: isDarkMode ? alpha(theme.palette.action.hover, 0.2) : '#e8eaed',
          } 
        }}
      >
        <SwapHorizIcon fontSize="small" />
      </IconButton>
      
      {/* 目标语言选择器 */}
      <Select
        value={targetLanguage}
        onChange={handleTargetLanguageChange}
        variant="standard"
        disableUnderline
        sx={{ 
          minWidth: 120, 
          color: theme.palette.text.primary,
          '& .MuiSelect-select': {
            py: 1,
            pr: 2,
            fontSize: '0.95rem',
            fontWeight: 'medium',
          },
          '& .MuiSelect-icon': {
            color: theme.palette.text.secondary
          }
        }}
      >
        <MenuItem value="zh">{LANGUAGES.zh}</MenuItem>
        <MenuItem value="en">{LANGUAGES.en}</MenuItem>
        <MenuItem value="de">{LANGUAGES.de}</MenuItem>
        <MenuItem value="ja">{LANGUAGES.ja}</MenuItem>
      </Select>
    </Box>
  );
};

export default LanguageSelector; 
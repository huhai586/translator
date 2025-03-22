import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  IconButton,
  Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';

interface SourcePanelProps {
  text: string;
  onTextChange: (text: string) => void;
  onTranslate: (text: string) => void;
  isTranslating: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  onTargetLanguageChange: (lang: string) => void;
  onSwapLanguages: () => void;
}

const SourcePanel: React.FC<SourcePanelProps> = ({ 
  text, 
  onTextChange, 
  onTranslate,
  isTranslating
}) => {
  const [copied, setCopied] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // 防抖函数，用于处理自动翻译
  const debouncedTranslate = useCallback((text: string) => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (text.trim()) {
        onTranslate(text);
      }
    }, 800); // 用户停止输入800毫秒后自动翻译
    
    setTypingTimeout(timeout);
  }, [onTranslate, typingTimeout]);

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    onTextChange(newText);
    
    // 当文本变化时触发自动翻译
    debouncedTranslate(newText);
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  // Handle clear text
  const handleClear = () => {
    onTextChange('');
  };

  // Handle copy text
  const handleCopy = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box 
      sx={{ 
        width: { xs: '100%', md: '50%' },
        height: { xs: '50%', md: '100%' },
        p: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
          <Box>
            <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
              <span>
                <IconButton onClick={handleCopy} disabled={!text} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Clear text">
              <span>
                <IconButton onClick={handleClear} disabled={!text} size="small">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
        
        <TextField
          multiline
          fullWidth
          value={text}
          onChange={handleTextChange}
          placeholder="Enter or paste text to translate"
          variant="outlined"
          sx={{ 
            flexGrow: 1,
            '& .MuiInputBase-root': {
              height: '100%',
              display: 'flex',
              alignItems: 'flex-start'
            },
            '& .MuiInputBase-input': {
              height: '100% !important',
              overflow: 'auto !important'
            }
          }}
        />
      </Paper>
    </Box>
  );
};

export default SourcePanel; 
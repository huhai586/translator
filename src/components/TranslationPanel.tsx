import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Tooltip,
  CircularProgress,
  Divider
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';

interface TranslationPanelProps {
  text: string;
  isLoading: boolean;
}

const TranslationPanel: React.FC<TranslationPanelProps> = ({ 
  text, 
  isLoading
}) => {
  const [copied, setCopied] = useState(false);

  // Handle copy translated text
  const handleCopy = () => {
    if (text && !isLoading) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle download as text file
  const handleDownload = () => {
    if (text && !isLoading) {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
                <IconButton 
                  onClick={handleCopy} 
                  disabled={!text || isLoading} 
                  size="small"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Download as text file">
              <span>
                <IconButton 
                  onClick={handleDownload} 
                  disabled={!text || isLoading} 
                  size="small"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            p: 2,
            bgcolor: 'background.default',
            borderRadius: 1,
            position: 'relative'
          }}
        >
          {isLoading ? (
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                height: '100%'
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <Typography 
              variant="body1" 
              component="div"
              sx={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word',
                height: '100%'
              }}
            >
              {text || 'Translation will appear here'}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default TranslationPanel; 
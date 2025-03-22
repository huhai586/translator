import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Link,
  Divider
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>About CrossLingua</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <TranslateIcon color="primary" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" component="h2" gutterBottom align="center">
            CrossLingua
          </Typography>
          <Typography variant="subtitle1" align="center" gutterBottom>
            Intelligent Real-time Translation Tool
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary">
            Version 1.0.0
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Features
        </Typography>
        <Typography variant="body2" paragraph>
          • Real-time AI-powered translation
        </Typography>
        <Typography variant="body2" paragraph>
          • Triple-click copy detection for instant translation
        </Typography>
        <Typography variant="body2" paragraph>
          • Support for multiple language models (GPT-3.5/4, Gemini Pro)
        </Typography>
        <Typography variant="body2" paragraph>
          • Dynamic load balancing between APIs
        </Typography>
        <Typography variant="body2" paragraph>
          • System tray integration for quick access
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          API Key Configuration
        </Typography>
        <Typography variant="body2" paragraph>
          CrossLingua requires API keys to function. Please configure your OpenAI and/or Google Gemini API keys in the settings.
        </Typography>
        <Typography variant="body2" paragraph>
          Your API keys are stored locally on your device and are never sent to our servers.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Privacy Policy
        </Typography>
        <Typography variant="body2" paragraph>
          CrossLingua is designed with privacy in mind. All translations are processed directly through the API services without storing your content.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Typography variant="h6" gutterBottom>
          Acknowledgements
        </Typography>
        <Typography variant="body2" paragraph>
          CrossLingua uses the following technologies:
        </Typography>
        <Typography variant="body2" paragraph>
          • Electron & React for the user interface
        </Typography>
        <Typography variant="body2" paragraph>
          • OpenAI GPT API and Google Gemini API for translations
        </Typography>
        <Typography variant="body2" paragraph>
          • Material-UI for the component library
        </Typography>
        
        <Box mt={2} textAlign="center">
          <Typography variant="body2">
            <Link
              component="button"
              variant="body2"
              onClick={() => window.electron.openExternal('https://github.com')}
            >
              GitHub Repository
            </Link>
            {' | '}
            <Link
              component="button"
              variant="body2"
              onClick={() => window.electron.openExternal('https://github.com/issues')}
            >
              Report Issues
            </Link>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AboutDialog; 
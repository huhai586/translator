import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Tooltip,
  Box,
  useTheme
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsIcon from '@mui/icons-material/Settings';
import InfoIcon from '@mui/icons-material/Info';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  darkMode, 
  onToggleDarkMode,
  onOpenSettings,
  onOpenAbout
}) => {
  const theme = useTheme();

  return (
    <AppBar 
      position="static" 
      color="default" 
      elevation={0}
      sx={{ 
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        '-webkit-app-region': 'drag',
        pt: '20px'
      }}
    >
      <Toolbar sx={{ '-webkit-app-region': 'drag' }}>
        <Typography variant="h6" color="inherit" noWrap sx={{ flexGrow: 1, '-webkit-app-region': 'drag' }}>
          CrossLingua
        </Typography>
        
        <Box sx={{ '-webkit-app-region': 'no-drag' }}>
          <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton onClick={onToggleDarkMode} color="inherit">
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton onClick={onOpenSettings} color="inherit">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="About">
            <IconButton onClick={onOpenAbout} color="inherit">
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 
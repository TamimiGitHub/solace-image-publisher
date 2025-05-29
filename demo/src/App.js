// /Users/tamimi/hack/image_publisher/demo/src/App.js
import React, { useState, useCallback } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Box, 
  Paper, 
  Alert, 
  Snackbar,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  IconButton,
  Collapse
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useSolaceClient from './components/SolaceClient';
import ImagesGrid from './components/ImagesGrid';

function App() {
  const [images, setImages] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState({
    url: process.env.REACT_APP_SOLACE_HOST || 'ws://localhost:8008',
    vpnName: process.env.REACT_APP_SOLACE_VPN || 'default',
    userName: process.env.REACT_APP_SOLACE_USERNAME || 'default',
    password: process.env.REACT_APP_SOLACE_PASSWORD || 'default',
    topicName: process.env.REACT_APP_SOLACE_TOPIC || 'solace/images/>',
  });

  // Handle received images
  const handleMessageReceived = useCallback((imageData) => {
    setImages(prevImages => {
      // Check if we already have this image (by id)
      const exists = prevImages.some(img => img.id === imageData.id);
      if (exists) return prevImages;

      // Add new image to the beginning of the array
      const newImages = [imageData, ...prevImages];
      
      // Show notification
      setNotification(`Received new image: ${imageData.id}`);
      
      // Return updated images array
      return newImages;
    });
  }, []);

  // Clear all images
  const clearImages = useCallback(() => {
    setImages([]);
    setNotification('All images cleared');
  }, []);

  // Connect to Solace broker
  const { isConnected, isConnecting, error, connect, disconnect } = useSolaceClient({
    ...config,
    onMessageReceived: handleMessageReceived
  });

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Solace Image Viewer
          </Typography>
          <Chip 
            label={isConnected ? "Connected" : "Disconnected"} 
            color={isConnected ? "success" : "error"}
            sx={{ mr: 2 }}
          />
          {isConnecting && (
            <CircularProgress size={24} color="inherit" sx={{ ml: 2 }} />
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Card sx={{ mb: 3 }}>
          <Box 
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              bgcolor: 'grey.50',
              '&:hover': {
                bgcolor: 'grey.100',
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: isConnected ? 'success.main' : 'error.main',
                  boxShadow: 1,
                  transition: 'background-color 0.3s ease'
                }}
              />
              <Typography variant="subtitle1" fontWeight="medium">
                Solace Connection
              </Typography>
              {isConnected && (
                <Typography variant="body2" color="text.secondary">
                  Connected to {config.url}
                </Typography>
              )}
            </Stack>
            <IconButton
              size="small"
              sx={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          <Collapse in={isExpanded}>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="URL"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  disabled={isConnected}
                  size="small"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="VPN"
                  value={config.vpnName}
                  onChange={(e) => setConfig({ ...config, vpnName: e.target.value })}
                  disabled={isConnected}
                  size="small"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Username"
                  value={config.userName}
                  onChange={(e) => setConfig({ ...config, userName: e.target.value })}
                  disabled={isConnected}
                  size="small"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  disabled={isConnected}
                  size="small"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Topic"
                  value={config.topicName}
                  onChange={(e) => setConfig({ ...config, topicName: e.target.value })}
                  disabled={isConnected}
                  size="small"
                  variant="outlined"
                />

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={connect}
                    disabled={isConnecting || isConnected}
                    color="primary"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </Button>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={disconnect}
                    disabled={!isConnected}
                    color="error"
                  >
                    Disconnect
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Collapse>
        </Card>

        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            bgcolor: 'background.default',
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <div>
              <Typography variant="h5" gutterBottom>
                Received Images
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Displaying images received from the Solace broker on topic '{config.topicName}'
              </Typography>
            </div>
            <Button
              variant="outlined"
              color="secondary"
              onClick={clearImages}
              disabled={images.length === 0}
            >
              Clear Images
            </Button>
          </Box>
          
          <ImagesGrid images={images} />
        </Paper>
      </Container>

      <Snackbar
        open={!!notification}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        message={notification}
      />
    </Box>
  );
}

export default App;

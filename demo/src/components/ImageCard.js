// /Users/tamimi/hack/image_publisher/demo/src/components/ImageCard.js
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Box, 
  CircularProgress, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button,
  IconButton
} from '@mui/material';

const ImageCard = ({ image }) => {
  if (!image) return null;

  const { id, base64Data, timestamp } = image;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  useEffect(() => {
    if (typeof base64Data === 'string' && base64Data.length > 0) {
      setLoading(true);
      try {
        // Clean the base64 data to handle various formats and prefixes
        let cleanedData = base64Data;
        
        // Log the first 30 characters for debugging
        console.log('Raw base64 data starts with:', base64Data.substring(0, 30));
        
        // Remove "Kn" prefix if present
        if (cleanedData.startsWith('Kn/9j/')) {
          cleanedData = cleanedData.substring(2);
          console.log('Removed "Kn" prefix from base64 data');
        }
        
        // Remove any whitespace, line breaks, etc.
        cleanedData = cleanedData.replace(/\s/g, '');
        
        // Try to decode URL-encoded characters if present
        if (cleanedData.includes('%')) {
          try {
            cleanedData = decodeURIComponent(cleanedData);
            console.log('Decoded URL-encoded characters in base64 data');
          } catch (decodeErr) {
            console.log('Failed to decode URL-encoded characters:', decodeErr);
            // Continue with the data as-is if decoding fails
          }
        }
        
        // Look for different image format signatures in the data
        // JPEG images should start with /9j/ in base64
        if (cleanedData.startsWith('/9j/') || 
            cleanedData.startsWith('9j/') || 
            cleanedData.indexOf('/9j/') > -1) {
          
          // Create a valid data URL for the image - JPEG
          console.log('Valid JPEG data found, creating image URL');
          setImageUrl(`data:image/jpeg;base64,${cleanedData}`);
          setError(false);
        } 
        // PNG images should start with iVBORw0K in base64
        else if (cleanedData.startsWith('iVBORw0K') || 
                 cleanedData.indexOf('iVBORw0K') > -1) {
          
          console.log('Valid PNG data found, creating image URL');
          setImageUrl(`data:image/png;base64,${cleanedData}`);
          setError(false);
        }
        // For other image types or unknown formats, try as JPEG first
        else {
          console.log('Base64 data does not match known formats, attempting to render as JPEG');
          console.log('Cleaned data starts with:', cleanedData.substring(0, 30));
          
          // Try to find a valid starting point in the data
          const jpegIndex = cleanedData.indexOf('/9j/');
          if (jpegIndex > -1) {
            cleanedData = cleanedData.substring(jpegIndex);
            console.log('Found JPEG data at position', jpegIndex);
            setImageUrl(`data:image/jpeg;base64,${cleanedData}`);
          } else {
            // Try as a generic image if no specific format is detected
            setImageUrl(`data:image/jpeg;base64,${cleanedData}`);
          }
        }
      } catch (err) {
        console.error('Error creating image URL:', err);
        setError(true);
        setLoading(false);
      }
    } else {
      console.error('Invalid base64 data');
      setError(true);
      setLoading(false);
    }
  }, [base64Data]);

  const handleImageLoad = () => {
    setLoading(false);
  };

  const handleImageError = (e) => {
    console.error('Image failed to load');
    setError(true);
    setLoading(false);
  };

  const openDetailsDialog = () => {
    setDetailsOpen(true);
  };

  const closeDetailsDialog = () => {
    setDetailsOpen(false);
  };

  return (
    <Card sx={{ maxWidth: 345, m: 2, boxShadow: 3 }}>
      <Box 
        sx={{ 
          height: 200, 
          bgcolor: '#f5f5f5', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative' 
        }}
      >
        {loading && !error && (
          <CircularProgress size={40} thickness={4} />
        )}

        {error ? (
          <Typography color="error">Failed to load image</Typography>
        ) : (
          imageUrl && (
            <CardMedia
              component="img"
              height="200"
              image={imageUrl}
              alt={`Image ${id}`}
              sx={{ 
                objectFit: 'contain',
                display: loading ? 'none' : 'block'
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )
        )}
      </Box>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography gutterBottom variant="h6" component="div" noWrap>
            Image {id}
          </Typography>
          <IconButton size="small" onClick={openDetailsDialog}>
          </IconButton>
        </Box>
      </CardContent>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={closeDetailsDialog} maxWidth="md">
        <DialogTitle>Image Details</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Image ID: {id}
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Format: {imageUrl.startsWith('data:image/png') ? 'PNG' : 
                    imageUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'Unknown'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ImageCard;

// /Users/tamimi/hack/image_publisher/demo/src/components/ImagesGrid.js
import React from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';
import ImageCard from './ImageCard';

const ImagesGrid = ({ images }) => {
  if (!images || images.length === 0) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 4, 
          m: 2, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: 200,
          bgcolor: '#f9f9f9'
        }}
      >
        <Typography variant="h5" color="text.secondary">
          No images found. Waiting for images from the Solace broker...
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, m: 2 }}>
      <Grid container spacing={2}>
        {images.map((image) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
            <ImageCard image={image} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ImagesGrid;

# Ideogram AI Integration Guide

This guide explains how to use the Ideogram AI integration in the AI Room Design project.

## Overview

The Ideogram AI integration allows you to generate high-quality images using the Ideogram AI model through Replicate's API. This feature is implemented as a separate module from the existing room design generation functionality, providing an alternative AI image generation option.

## Setup

1. Ensure you have a Replicate API token. You can get one by signing up at [replicate.com](https://replicate.com).

2. Add your Replicate API token to your `.env` file:

```
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

## Components

The integration consists of the following components:

### 1. Configuration Module

Location: `config/ideogramConfig.js`

This module initializes the Replicate client and provides the `generateIdeogramImage` function that handles image generation using the Ideogram AI model.

```javascript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateIdeogramImage({
  prompt,
  style = 'photographic',
  aspectRatio = '1:1',
  outputDir = './public/generated',
  filename = `ideogram-${Date.now()}.png`,
}) {
  // Implementation details...
}
```

### 2. API Endpoint

Location: `app/api/generate-image/route.js`

This API endpoint handles image generation requests from the frontend. It validates the input, calls the `generateIdeogramImage` function, and returns the generated image URL.

### 3. UI Component

Location: `app/dashboard/generate-image/page.jsx`

This page provides a user interface for generating images with Ideogram AI. Users can enter a prompt, select a style and aspect ratio, and generate an image.

## Usage

### From the UI

1. Navigate to the "Generate Image" page from the dashboard.
2. Enter a prompt describing the image you want to generate.
3. Select a style and aspect ratio.
4. Click the "Generate Image" button.
5. Wait for the image to be generated and displayed.

### Programmatically

You can also use the Ideogram AI integration programmatically in your code:

```javascript
import { generateIdeogramImage } from '@/config/ideogramConfig';

async function generateImage() {
  try {
    const imageUrl = await generateIdeogramImage({
      prompt: 'A modern living room with minimalist furniture',
      style: 'photographic',
      aspectRatio: '16:9',
    });
    
    console.log('Generated image URL:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}
```

## Customization

### Available Styles

The following styles are available for image generation:

- `photographic`: Realistic photographic style
- `digital-art`: Digital art style
- `illustration`: Illustration style
- `painting`: Painting style
- `cartoon`: Cartoon style

### Aspect Ratios

The following aspect ratios are available:

- `1:1`: Square
- `16:9`: Landscape
- `9:16`: Portrait
- `4:3`: Standard

## Troubleshooting

### Common Issues

1. **API Token Invalid**: Ensure your Replicate API token is correctly set in the `.env` file.

2. **Generation Fails**: Check the console for error messages. The most common issues are related to API rate limits or invalid prompts.

3. **Image Not Displaying**: Ensure the image URL is correctly returned from the API and that the frontend is correctly handling the response.

## Extending the Integration

You can extend the Ideogram AI integration by:

1. Adding more style options
2. Supporting additional aspect ratios
3. Implementing image variations
4. Adding image editing capabilities

Refer to the [Replicate API documentation](https://replicate.com/docs) and [Ideogram AI model documentation](https://replicate.com/ideogram-ai/ideogram-v3-turbo) for more information on available options and parameters.
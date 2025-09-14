// Ideogram AI configuration for Replicate
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Initialize Replicate client with API token from environment variables
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Ideogram AI model ID
const IDEOGRAM_MODEL = 'ideogram-ai/ideogram-v3-turbo';

/**
 * Generate an image using Ideogram AI
 * @param {Object} options - Configuration options
 * @param {string} options.prompt - Text prompt for image generation
 * @param {string} options.style - Style of the image (optional)
 * @param {string} options.aspectRatio - Aspect ratio of the image (optional)
 * @param {string} options.outputDir - Directory to save the image (optional)
 * @param {string} options.filename - Filename for the saved image (optional)
 * @returns {Promise<string>} - URL of the generated image
 */
export async function generateIdeogramImage({
  prompt,
  style = 'photographic',
  aspectRatio = '1:1',
  outputDir = './public/generated',
  filename = `ideogram-${Date.now()}.png`,
}) {
  try {
    // Prepare input parameters for the model
    const input = {
      prompt: prompt,
      style: style,
      aspect_ratio: aspectRatio,
    };
    
    console.log(`Generating image with prompt: ${prompt}`);
    
    // Run the Ideogram model
    const output = await replicate.run(IDEOGRAM_MODEL, { input });
    
    // Get the image URL
    const imageUrl = output[0];
    console.log(`Image generated: ${imageUrl}`);
    
    // Save the image to disk if outputDir is provided
    if (outputDir) {
      try {
        // Ensure the output directory exists
        await fsPromises.mkdir(outputDir, { recursive: true });
        
        // Download and save the image
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const filePath = path.join(outputDir, filename);
        
        await fsPromises.writeFile(filePath, Buffer.from(buffer));
        console.log(`Image saved to: ${filePath}`);
      } catch (saveError) {
        console.error('Error saving the image:', saveError);
      }
    }
    
    return imageUrl;
  } catch (error) {
    console.error('Error generating image with Ideogram:', error);
    throw error;
  }
}

export { replicate };
// Replicate API configuration
import Replicate from 'replicate';

// Initialize Replicate client with API token from environment variables
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Room redesign model - using Stable Diffusion XL for interior design
const ROOM_REDESIGN_MODEL = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';

// Function to generate room design based on input image and parameters
export async function generateRoomDesign({
  imageUrl,
  roomType,
  designStyle,
  additionalRequirements,
}) {
  try {
    const prompt = `A professional interior design for a ${roomType} in ${designStyle} style. ${additionalRequirements || ''}`;
    
    const output = await replicate.run(
      ROOM_REDESIGN_MODEL,
      {
        input: {
          image: imageUrl,
          prompt: prompt,
          negative_prompt: "poor quality, blurry, distorted furniture, unrealistic architecture, bad proportions",
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
          strength: 0.8, // Balance between original image and generated content
        }
      }
    );
    
    return output;
  } catch (error) {
    console.error('Error generating room design:', error);
    throw error;
  }
}

export { replicate };
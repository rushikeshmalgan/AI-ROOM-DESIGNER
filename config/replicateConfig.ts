import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const ROOM_REDESIGN_MODEL = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea53525255b1aa35c5565e08b';

export interface GenerateRoomDesignInput {
  imageUrl: string;
  roomType: string;
  designStyle: string;
  additionalRequirements?: string | null;
}

export async function generateRoomDesign({
  imageUrl,
  roomType,
  designStyle,
  additionalRequirements,
}: GenerateRoomDesignInput): Promise<string[]> {
  try {
    const prompt = `A professional interior design for a ${roomType} in ${designStyle} style. ${additionalRequirements || ''}`;

    // Replicate SDK types run() return as Promise<object> — the SDXL
    // image-to-image output is a string[] of generated image URLs.
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
          strength: 0.8,
        }
      }
    );

    return output as unknown as string[];
  } catch (error) {
    console.error('Error generating room design:', error);
    throw error;
  }
}

export { replicate };

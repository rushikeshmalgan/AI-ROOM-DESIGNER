import Replicate from 'replicate';
import { promises as fsPromises } from 'fs';
import path from 'path';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const IDEOGRAM_MODEL = 'ideogram-ai/ideogram-v3-turbo';

export interface GenerateIdeogramImageInput {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  outputDir?: string;
  filename?: string;
}

export async function generateIdeogramImage({
  prompt,
  style = 'photographic',
  aspectRatio = '1:1',
  outputDir = './public/generated',
  filename = `ideogram-${Date.now()}.png`,
}: GenerateIdeogramImageInput): Promise<string> {
  try {
    const input = {
      prompt: prompt,
      style: style,
      aspect_ratio: aspectRatio,
    };

    console.log(`Generating image with prompt: ${prompt}`);

    // Replicate SDK types run() as Promise<object> — Ideogram's output
    // is actually a string[] of image URLs.
    const output = await replicate.run(IDEOGRAM_MODEL, { input }) as unknown as string[];

    const imageUrl: string = output[0];
    console.log(`Image generated: ${imageUrl}`);

    if (outputDir && imageUrl) {
      try {
        await fsPromises.mkdir(outputDir, { recursive: true });

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

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const IDEOGRAM_MODEL = 'ideogram-ai/ideogram-v3-turbo';

export interface GenerateIdeogramImageInput {
  prompt: string;
  style?: string;
  aspectRatio?: string;
}

// Replicate hosts the generated image on its own CDN (the returned URL
// is durable — this is the same pattern generate-design/replicateConfig
// already relies on). No local filesystem write: serverless deploy
// targets have an ephemeral (often read-only) filesystem, so writing to
// ./public/generated would silently no-op or throw in production.
export async function generateIdeogramImage({
  prompt,
  style = 'photographic',
  aspectRatio = '1:1',
}: GenerateIdeogramImageInput): Promise<string> {
  const input = {
    prompt: prompt,
    style: style,
    aspect_ratio: aspectRatio,
  };

  // Replicate SDK types run() as Promise<object> — Ideogram's output
  // is actually a string[] of image URLs.
  const output = await replicate.run(IDEOGRAM_MODEL, { input }) as unknown as string[];

  return output[0];
}

export { replicate };

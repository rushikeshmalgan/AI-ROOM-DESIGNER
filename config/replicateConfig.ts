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

export interface RefineRoomDesignInput {
  // The PREVIOUS generation's image, not the original room photo — a
  // refinement iterates on what the user already has, not what they
  // started with.
  sourceImageUrl: string;
  roomType: string;
  designStyle: string;
  instruction: string;
}

// SDXL img2img has no concept of "edit only this region" — it's a single
// prompt + a strength dial controlling how much of the source image is
// kept vs. regenerated. There's no masking/inpainting here, so this
// can bias the model toward smaller, targeted changes; it cannot
// guarantee only the requested object changes. Product copy should say
// "refine this design," never "guaranteed to change only one thing."
//
// Refinement vs. initial generation, and why:
//   - strength 0.5 (vs 0.8 for initial): initial generation is meant to
//     transform a real photo into a styled room, so it needs room to
//     deviate heavily from the source. A refinement starts from an
//     already-styled image and should change less of it — 0.5 is a
//     starting heuristic (keep more of the previous frame) that will
//     need real-world tuning once there's a corpus of before/after
//     refinements to look at.
//   - guidance_scale 8.5 (vs 7.5 for initial): with less freedom to
//     deviate from the source (lower strength), the model needs
//     stronger prompt adherence to make sure the one requested change
//     actually shows up rather than being smoothed away.
//   - num_inference_steps unchanged at 50 — no evidence yet that this
//     needs to differ, and changing it would confound the strength/
//     guidance comparison above.
export async function refineRoomDesign({
  sourceImageUrl,
  roomType,
  designStyle,
  instruction,
}: RefineRoomDesignInput): Promise<string[]> {
  try {
    const prompt = [
      `Professional interior redesign of a ${roomType} in ${designStyle} style.`,
      `Change requested: ${instruction}.`,
      `Preserve the room architecture, walls, windows, doors, and camera perspective exactly as shown.`,
      `Keep all existing furniture, decor, and colors unchanged except for what was explicitly requested.`,
      `Maintain realistic lighting and proportions.`,
    ].join(' ');

    const output = await replicate.run(
      ROOM_REDESIGN_MODEL,
      {
        input: {
          image: sourceImageUrl,
          prompt: prompt,
          negative_prompt: "poor quality, blurry, distorted furniture, unrealistic architecture, bad proportions, different room layout, changed walls, changed windows, changed camera angle, changed perspective",
          num_outputs: 1,
          guidance_scale: 8.5,
          num_inference_steps: 50,
          strength: 0.5,
        }
      }
    );

    return output as unknown as string[];
  } catch (error) {
    console.error('Error refining room design:', error);
    throw error;
  }
}

export { replicate };

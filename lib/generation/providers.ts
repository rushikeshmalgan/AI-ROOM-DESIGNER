import { generateRoomDesign, refineRoomDesign } from '@/config/replicateConfig';
import type { ImageGenerationProvider, GenerateInput, RefineInput, ProviderResult } from './types';

// Wraps the existing, already-correct SDXL logic in config/replicateConfig.ts
// behind the provider interface — no behavior change, just a seam. This is
// the room-redesign path (generate-design, refine); Ideogram
// (generate-image) is intentionally NOT wired through this interface —
// it's a free-text-prompt, generate-only, no-refine-concept flow with no
// natural fit to GenerateInput's room/style shape, and forcing it in would
// be an adapter that loses information rather than a real abstraction. See
// PROJECT_AUDIT.md.
class ReplicateSdxlProvider implements ImageGenerationProvider {
  async generate(input: GenerateInput): Promise<ProviderResult> {
    const imageUrls = await generateRoomDesign(input);
    return { imageUrls };
  }

  async refine(input: RefineInput): Promise<ProviderResult> {
    const imageUrls = await refineRoomDesign(input);
    return { imageUrls };
  }
}

export const replicateSdxlProvider: ImageGenerationProvider = new ReplicateSdxlProvider();

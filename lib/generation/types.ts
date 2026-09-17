// The seam the rest of the app depends on instead of Replicate directly.
// Route handlers and GenerationService only ever import this file's types
// plus a concrete provider instance (replicateSdxlProvider /
// replicateIdeogramProvider from providers.ts) — never
// @/config/replicateConfig or @/config/ideogramConfig, and never the
// `replicate` package itself.
//
// Only generate()/refine() exist right now — no getStatus()/cancel().
// Those only mean something for an async/polling provider, and nothing
// in this codebase is async yet (see PROJECT_AUDIT.md's "Why not go
// async yet"). Adding them now, unused, would be exactly the kind of
// speculative interface surface that's harder to get right *before* a
// second real implementation exists to validate the shape against.
export interface GenerateInput {
  imageUrl: string;
  roomType: string;
  designStyle: string;
  additionalRequirements?: string | null;
}

export interface RefineInput {
  sourceImageUrl: string;
  roomType: string;
  designStyle: string;
  instruction: string;
}

export interface ProviderResult {
  imageUrls: string[];
}

export interface ImageGenerationProvider {
  generate(input: GenerateInput): Promise<ProviderResult>;
  // Ideogram (text-to-image only) has no refine() concept — its
  // provider implements this by throwing, rather than the interface
  // making the method optional and pushing an `if (provider.refine)`
  // check onto every caller.
  refine(input: RefineInput): Promise<ProviderResult>;
}

// Minimal structured logging for AI generations — no new infrastructure,
// just a consistent JSON shape on top of console.log so these lines can
// be grepped/parsed from whatever log aggregation is in front of the
// deployment (Vercel logs, etc.) without committing to one now. This is
// the whole of "observability" for this iteration: enough to compute
// success rate, latency, and cost-relevant volume per provider by
// parsing logs, not a metrics/tracing platform.
export interface GenerationLogEvent {
  generationId: string;
  userId: string;
  designId?: number | string | null;
  parentDesignId?: number | string | null;
  provider: 'replicate-sdxl' | 'replicate-ideogram';
  generationType: 'initial' | 'refinement';
  roomType?: string;
  designStyle?: string;
  durationMs: number;
  success: boolean;
  failureReason?: string;
}

export function newGenerationId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `gen_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function logGeneration(event: GenerationLogEvent): void {
  console.log(JSON.stringify({ type: 'generation', timestamp: new Date().toISOString(), ...event }));
}

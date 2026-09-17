import { db } from '@/config/db';
import { generations } from '@/config/schema';
import { eq } from 'drizzle-orm';

export type GenerationType = 'initial' | 'refinement';
export type GenerationProviderName = 'replicate-sdxl' | 'replicate-ideogram';

export interface AttemptMeta {
  userId: string;
  generationType: GenerationType;
  provider: GenerationProviderName;
  roomType?: string;
  designStyle?: string;
  instruction?: string;
  parentDesignId?: number | null;
}

export interface AttemptResult {
  generationId: number | null;
  success: boolean;
  imageUrls?: string[];
  errorMessage?: string;
  latencyMs: number;
}

// The lifecycle bookkeeping that used to live duplicated across three
// route handlers (generationId, startTime, try/catch, logGeneration,
// trackEvent) — now also persisted as an actual DB row, not just a log
// line. Route handlers still own auth/credits/validation/persisting the
// resulting `designs` row; this only owns "did the provider call
// succeed, and what does that attempt's record look like."
//
// insert-then-update rather than a single insert at the end: a `pending`
// row exists in the database for the duration of the provider call, so
// a request that never returns (crash, timeout) still leaves a
// `pending` row behind instead of no evidence the attempt ever started.
export async function runGenerationAttempt(
  meta: AttemptMeta,
  call: () => Promise<{ imageUrls: string[] }>
): Promise<AttemptResult> {
  let generationId: number | null = null;

  try {
    const inserted = await db.insert(generations).values({
      userId: meta.userId,
      parentDesignId: meta.parentDesignId ?? null,
      status: 'processing',
      generationType: meta.generationType,
      provider: meta.provider,
      roomType: meta.roomType,
      designStyle: meta.designStyle,
      instruction: meta.instruction,
    }).returning({ id: generations.id });
    generationId = inserted[0]?.id ?? null;
  } catch (dbError) {
    // If we can't even record the attempt, don't block the actual
    // generation on it — this table is an audit trail, not a gate.
    console.error('Failed to record generation attempt (best-effort):', dbError);
  }

  const startTime = Date.now();
  let latencyMs: number;
  let errorMessage: string | undefined;
  let imageUrls: string[] | undefined;

  try {
    const result = await call();
    latencyMs = Date.now() - startTime;
    // A provider call that resolves without throwing but returns nothing
    // usable is still a failed attempt, not a "completed" one — the
    // generations table should reflect whether a design was actually
    // produced, not just whether the HTTP call to the provider survived.
    if (!result.imageUrls || result.imageUrls.length === 0) {
      errorMessage = 'Provider returned no images';
    } else {
      imageUrls = result.imageUrls;
    }
  } catch (error) {
    latencyMs = Date.now() - startTime;
    errorMessage = error instanceof Error ? error.message : 'unknown error';
  }

  const success = errorMessage === undefined;

  if (generationId !== null) {
    try {
      await db.update(generations)
        .set({
          status: success ? 'completed' : 'failed',
          latencyMs,
          errorMessage,
          completedAt: new Date(),
        })
        .where(eq(generations.id, generationId));
    } catch (dbError) {
      console.error(`Failed to update generation attempt to ${success ? 'completed' : 'failed'} (best-effort):`, dbError);
    }
  }

  return success
    ? { generationId, success: true, imageUrls, latencyMs }
    : { generationId, success: false, errorMessage, latencyMs };
}

// Called once the resulting `designs` row exists, so the attempt record
// links forward to what it produced (nothing to call if the attempt failed).
export async function linkGenerationToDesign(generationId: number | null, designId: number): Promise<void> {
  if (generationId === null) return;
  try {
    await db.update(generations).set({ designId }).where(eq(generations.id, generationId));
  } catch (dbError) {
    console.error('Failed to link generation attempt to its design (best-effort):', dbError);
  }
}

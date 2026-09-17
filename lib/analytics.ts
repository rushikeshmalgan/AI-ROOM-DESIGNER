import { db } from '@/config/db';
import { events } from '@/config/schema';

// The full set of tracked events. Keep this list and
// docs/analytics-funnel.md in sync — that doc is what defines the
// funnel these events are meant to answer.
export type AnalyticsEventName =
  | 'landing_view'
  | 'signup'
  | 'dashboard_view'
  | 'create_design_started'
  | 'image_uploaded'
  | 'generation_started'
  | 'generation_succeeded'
  | 'generation_failed'
  | 'refinement_started'
  | 'refinement_succeeded'
  | 'refinement_failed'
  | 'design_saved'
  | 'design_shared'
  | 'generation_feedback'
  | 'refinement_quality_feedback';

export interface TrackEventInput {
  event: AnalyticsEventName;
  userId?: string | null;
  properties?: Record<string, unknown>;
}

// Best-effort, server-side only — never throws, never blocks whatever
// request it's called from (same pattern as lib/credits.syncCreditsToDb).
// `properties` must never contain raw uploaded images, full user
// prompts, or anything else sensitive — see docs/analytics-funnel.md for
// the allowed property list per event.
export async function trackEvent({ event, userId, properties }: TrackEventInput): Promise<void> {
  try {
    await db.insert(events).values({
      userId: userId ?? null,
      event,
      properties: properties ?? null,
    });
  } catch (err) {
    console.error('Failed to record analytics event (best-effort):', event, err);
  }
}

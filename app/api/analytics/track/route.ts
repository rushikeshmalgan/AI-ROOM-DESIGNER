import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { trackEvent, type AnalyticsEventName } from '@/lib/analytics';

// Only events that legitimately originate client-side and aren't
// already captured server-side. The generation/refinement lifecycle
// (started/succeeded/failed) is tracked directly in
// generate-design/generate-image/refine's route handlers instead —
// that's where the real latency/success/provider data already lives,
// and it can't be spoofed or duplicated by a client-side call the way
// a public endpoint like this one could be.
const CLIENT_TRACKABLE_EVENTS: AnalyticsEventName[] = [
  'landing_view',
  'dashboard_view',
  'create_design_started',
  'image_uploaded',
  'design_saved',
  'design_shared',
  'generation_feedback',
  'refinement_quality_feedback',
];

const MAX_PROPERTIES_JSON_LENGTH = 2000;

export async function POST(request: Request): Promise<NextResponse> {
  // Analytics must never break the page it's called from — always 200,
  // even on a bad payload. There's nothing useful a caller can do with
  // a 400 here, and it's not worth risking a console error on a page
  // that otherwise works fine.
  try {
    const body = await request.json();
    const event = body?.event;
    const properties = body?.properties;

    if (typeof event !== 'string' || !CLIENT_TRACKABLE_EVENTS.includes(event as AnalyticsEventName)) {
      return NextResponse.json({ success: false }, { status: 200 });
    }
    if (properties !== undefined) {
      if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
        return NextResponse.json({ success: false }, { status: 200 });
      }
      if (JSON.stringify(properties).length > MAX_PROPERTIES_JSON_LENGTH) {
        return NextResponse.json({ success: false }, { status: 200 });
      }
    }

    const user = await currentUser().catch(() => null);
    await trackEvent({ event: event as AnalyticsEventName, userId: user?.id ?? null, properties });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

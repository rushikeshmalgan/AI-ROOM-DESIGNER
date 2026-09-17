import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { upsertUserFromClerk } from '@/lib/userUpsert';
import { trackEvent } from '@/lib/analytics';

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 401 });
  }

  const payload = await request.text();

  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  if (evt.type === 'user.created') {
    const data = evt.data;
    try {
      await upsertUserFromClerk({
        id: data.id as string,
        fullName: data.full_name as string | null,
        primaryEmailAddress: data.primary_email_address_id
          ? { emailAddress: (data.email_addresses as Array<{ id: string; email_address: string }>)?.find(
              (e) => e.id === data.primary_email_address_id
            )?.email_address ?? '' }
          : null,
        emailAddresses: (data.email_addresses as Array<{ email_address: string }>)?.map(
          (e) => ({ emailAddress: e.email_address })
        ),
        imageUrl: data.image_url as string | undefined,
      });
    } catch (err) {
      console.error('Failed to provision user from webhook:', err);
      return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 });
    }

    void trackEvent({ event: 'signup', userId: data.id as string });
  }

  // Acknowledge receipt — Clerk expects a 2xx response
  return NextResponse.json({ success: true });
}

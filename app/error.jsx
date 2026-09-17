'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Next.js error boundary — catches unhandled render/render-effect
// exceptions anywhere under the root layout that aren't already caught
// by a route's own try/catch. There was no boundary at all before
// this, so any such exception fell through to Next's default error
// overlay with no recovery path for the user.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This wasn&apos;t a lost credit or a failed generation — the page itself hit an
          unexpected error. Try again, or head back to your dashboard.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

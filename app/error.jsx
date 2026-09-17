'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="max-w-md w-full p-8 text-center" shadow="lg">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          This wasn&apos;t a lost credit or a failed generation — the page itself hit an
          unexpected error. Try again, or head back to your dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="primary">Go to Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

import Link from 'next/link';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-white to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="max-w-md w-full p-8 text-center" shadow="lg">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Page not found
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          That page doesn&apos;t exist, or has moved.
        </p>
        <Link href="/dashboard">
          <Button variant="primary">Go to Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}

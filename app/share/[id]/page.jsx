import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import Button from '@/app/components/ui/Button';

// Public, unauthenticated route — this page must never leak a private
// design. isPublic is only ever set true via POST /api/designs/:id/share,
// and every lookup here re-checks it rather than trusting the URL alone.
async function getPublicDesign(id) {
  const designId = Number(id);
  if (!Number.isInteger(designId) || designId <= 0) return null;

  const rows = await db.select().from(designs).where(eq(designs.id, designId));
  const design = rows[0];
  if (!design || !design.isPublic) return null;
  return design;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const design = await getPublicDesign(id);

  if (!design) {
    return { title: 'Design not found — AI Room Design' };
  }

  const title = `AI Room Transformation — ${design.designType} ${design.roomType}`;
  const description = `See this ${design.designType} ${design.roomType} redesigned with AI Room Design.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: design.generatedImageUrl ? [{ url: design.generatedImageUrl }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: design.generatedImageUrl ? [design.generatedImageUrl] : [],
    },
  };
}

export default async function SharedDesignPage({ params }) {
  const { id } = await params;
  const design = await getPublicDesign(id);
  if (!design) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {design.designType} {design.roomType}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Created with AI Room Designer
          </p>
        </div>

        {design.originalImageUrl ? (
          <BeforeAfterSlider
            beforeSrc={design.originalImageUrl}
            afterSrc={design.generatedImageUrl}
            beforeLabel="Before"
            afterLabel="After"
          />
        ) : (
          <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={design.generatedImageUrl}
              alt={`${design.designType} ${design.roomType}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/dashboard">
            <Button variant="primary" size="large">
              Design your own room
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

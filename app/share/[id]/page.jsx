import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 pb-32 pt-12 sm:px-6 sm:pt-20">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            AI Room Designer
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {design.designType} {design.roomType}
          </h1>
        </header>

        <div className="overflow-hidden rounded-xl border border-border/70">
          {design.originalImageUrl ? (
            <BeforeAfterSlider
              beforeSrc={design.originalImageUrl}
              afterSrc={design.generatedImageUrl}
              beforeLabel="Before"
              afterLabel="AI Redesign"
            />
          ) : (
            <div className="relative aspect-[4/3] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={design.generatedImageUrl}
                alt={`${design.designType} ${design.roomType}`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>

        {design.originalImageUrl && (
          <p className="mt-3 text-xs text-muted-foreground">
            Drag the divider to compare the original room with the AI redesign.
          </p>
        )}
      </main>

      {/* Floating CTA */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
          <p className="text-sm text-muted-foreground">Designed with AI Room Designer</p>
          <Button asChild>
            <Link href="/dashboard">Design your own room</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

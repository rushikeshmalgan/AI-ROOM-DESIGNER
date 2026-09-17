"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { Download, Share2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import GenerationFeedback from '@/app/components/ui/GenerationFeedback';
import RefinementQualityFeedback from '@/app/components/ui/RefinementQualityFeedback';
import { track } from '@/lib/analyticsClient';

const SUGGESTED_REFINEMENTS = [
  'Change the sofa',
  'Make the walls warmer',
  'Add a rug',
  'Make the lighting warmer',
  'Change the curtains',
];

const MAX_INSTRUCTION_LENGTH = 300;

function versionLabel(index) {
  return index === 0 ? 'Original' : `Refinement ${index}`;
}

// Renders one version chain (an original generation plus any
// refinements made from it) as a simple vertical sequence — not a tree
// editor. Each step shows what changed relative to the version before
// it; refining always targets the latest version in the chain.
function DesignChain({ chain, onRefined }) {
  const root = chain[0];
  const latest = chain[chain.length - 1];

  const [instruction, setInstruction] = useState('');
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState('');

  const [sharingId, setSharingId] = useState(null);
  const [shareError, setShareError] = useState(null); // { designId, message } | null

  const handleShare = async (design) => {
    setSharingId(design.id);
    setShareError(null);
    try {
      // Designs are private by default — this is the explicit opt-in
      // that makes /share/:id visible for this one design. Idempotent:
      // safe to call again for an already-public design.
      const shareRes = await axios.post(`/api/designs/${design.id}/share`);
      const shareUrl = `${window.location.origin}${shareRes.data.shareUrl}`;

      const shareData = {
        title: `${design.roomType} - ${design.designType} Style Design`,
        text: `Check out this AI-generated ${design.designType} ${design.roomType} design!`,
        url: shareUrl,
      };

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData);
          track('design_shared', { designId: design.id, method: 'native_share' });
          return;
        } catch (err) {
          if (err.name !== 'AbortError') console.error('Error sharing:', err);
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        track('design_shared', { designId: design.id, method: 'copy_link' });
      }
    } catch (err) {
      console.error('Error sharing design:', err);
      setShareError({ designId: design.id, message: 'Could not create a share link. Please try again.' });
    } finally {
      setSharingId(null);
    }
  };

  const handleRefine = async () => {
    const trimmed = instruction.trim();
    if (!trimmed) {
      setError('Describe what you would like to change.');
      return;
    }
    if (refining) return; // guards against double-submit beyond the disabled button

    setRefining(true);
    setError('');
    try {
      const res = await axios.post(`/api/designs/${latest.id}/refine`, { instruction: trimmed });
      if (res.data?.success) {
        onRefined(
          res.data.design ?? {
            id: `pending-${Date.now()}`,
            userId: latest.userId,
            originalImageUrl: latest.originalImageUrl,
            generatedImageUrl: res.data.generatedImageUrl,
            roomType: latest.roomType,
            designType: latest.designType,
            additionalRequirements: trimmed,
            parentDesignId: latest.id,
            createdAt: new Date().toISOString(),
          }
        );
        setInstruction('');
      } else {
        setError('Failed to refine design. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setRefining(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-border/70 bg-card transition-colors duration-200 hover:border-border"
      data-testid={`design-chain-${root.id}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">
          {root.roomType} <span className="text-muted-foreground">· {root.designType} style</span>
        </h3>
        {chain.length > 1 && (
          <Badge variant="secondary" className="shrink-0 font-normal">
            {chain.length} versions
          </Badge>
        )}
      </div>

      <div className="space-y-5 px-4 pb-4">
        {chain.map((design, index) => {
          const parent = index === 0 ? null : chain[index - 1];
          return (
            <div key={design.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {versionLabel(index)}
                </span>
                {parent && (
                  <span className="truncate text-xs italic text-muted-foreground">
                    &ldquo;{design.additionalRequirements}&rdquo;
                  </span>
                )}
              </div>
              <BeforeAfterSlider
                beforeSrc={parent ? parent.generatedImageUrl : design.originalImageUrl}
                afterSrc={design.generatedImageUrl}
                beforeLabel={parent ? 'Previous' : 'Before'}
                afterLabel={parent ? 'This version' : 'After'}
              />
              <div className="mt-2 flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => {
                    track('design_saved', { designId: design.id });
                    window.open(design.generatedImageUrl, '_blank');
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => handleShare(design)}
                  disabled={sharingId === design.id}
                >
                  {sharingId === design.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {sharingId === design.id ? 'Sharing...' : 'Share'}
                </Button>
              </div>
              {shareError?.designId === design.id && (
                <p className="mt-1 text-xs text-destructive">{shareError.message}</p>
              )}
              {parent ? (
                <RefinementQualityFeedback designId={design.id} />
              ) : (
                <GenerationFeedback designId={design.id} />
              )}
            </div>
          );
        })}

        <div className="border-t border-border/60 pt-4">
          <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            What would you like to change?
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTED_REFINEMENTS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={refining}
                onClick={() => { setInstruction(suggestion); setError(''); }}
                className="rounded-full border border-border/80 px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={instruction}
              onChange={(e) => { setInstruction(e.target.value); setError(''); }}
              placeholder="e.g., Change the sofa to a beige sectional"
              disabled={refining}
              maxLength={MAX_INSTRUCTION_LENGTH}
              className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            />
            <Button
              onClick={handleRefine}
              disabled={refining || !instruction.trim()}
              size="sm"
            >
              {refining && <Loader2 className="h-4 w-4 animate-spin" />}
              {refining ? 'Refining...' : 'Refine Design'}
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DesignChain;

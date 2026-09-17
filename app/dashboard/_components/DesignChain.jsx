"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { Download, Share2, Sparkles, Loader2, CornerDownRight } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import BeforeAfterSlider from '@/app/components/ui/BeforeAfterSlider';
import { track } from '@/lib/analyticsClient';

const SUGGESTED_REFINEMENTS = [
  'Change the sofa',
  'Make the walls warmer',
  'Add a rug',
  'Make the lighting warmer',
  'Change the curtains',
];

const MAX_INSTRUCTION_LENGTH = 300;

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

  const handleShare = async (design) => {
    const shareUrl = design.generatedImageUrl || window.location.href;
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
      try {
        await navigator.clipboard.writeText(shareUrl);
        track('design_shared', { designId: design.id, method: 'copy_link' });
      } catch (clipboardErr) {
        console.error('Clipboard copy failed:', clipboardErr);
      }
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
    <Card className="overflow-hidden" hover shadow="lg" padding="none" data-testid={`design-chain-${root.id}`}>
      <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200">
          {root.roomType} · {root.designType} style
          {chain.length > 1 && (
            <span className="ml-2 text-xs font-normal text-purple-500">
              {chain.length} versions
            </span>
          )}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(root.createdAt)}</span>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        {chain.map((design, index) => {
          const parent = index === 0 ? null : chain[index - 1];
          return (
            <div key={design.id}>
              {parent && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2 pl-1">
                  <CornerDownRight className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="italic">&ldquo;{design.additionalRequirements}&rdquo;</span>
                </div>
              )}
              <BeforeAfterSlider
                beforeSrc={parent ? parent.generatedImageUrl : design.originalImageUrl}
                afterSrc={design.generatedImageUrl}
                beforeLabel={parent ? 'Previous' : 'Before'}
                afterLabel={parent ? 'This version' : 'After'}
              />
              <div className="flex flex-wrap justify-between gap-2 mt-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    track('design_saved', { designId: design.id });
                    window.open(design.generatedImageUrl, '_blank');
                  }}
                  icon={<Download className="h-4 w-4" />}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleShare(design)}
                  icon={<Share2 className="h-4 w-4" />}
                >
                  Share
                </Button>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            What would you like to change?
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SUGGESTED_REFINEMENTS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={refining}
                onClick={() => { setInstruction(suggestion); setError(''); }}
                className="text-xs px-2.5 py-1 rounded-full border border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 min-w-0 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
            <Button
              onClick={handleRefine}
              disabled={refining || !instruction.trim()}
              size="small"
              icon={refining ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              {refining ? 'Refining...' : 'Refine Design'}
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default DesignChain;

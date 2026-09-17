'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analyticsClient';

const OPTIONS = [
  { key: 'changedWhatAsked', label: 'It changed what I asked' },
  { key: 'preservedRoom', label: 'It preserved the room' },
  { key: 'changedTooMuch', label: 'It changed too much' },
  { key: 'unrealistic', label: 'The result looked unrealistic' },
];

function storageKey(designId) {
  return `refinement-quality-feedback-${designId}`;
}

// Directly measures the known limitation of prompt-driven SDXL
// refinement (see README's "Refinement can't guarantee single-object
// edits") — this data, not a guess, is what should decide whether the
// next AI investment is better prompting, lower strength, or
// segmentation/masking. See docs/ai-quality-decision-framework.md.
export default function RefinementQualityFeedback({ designId }) {
  const [answered, setAnswered] = useState(true);
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      setAnswered(Boolean(window.localStorage.getItem(storageKey(designId))));
    } catch {
      setAnswered(false);
    }
  }, [designId]);

  const toggle = (key) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => {
    track('refinement_quality_feedback', { designId, ...selected });
    setSubmitted(true);
    try {
      window.localStorage.setItem(storageKey(designId), '1');
    } catch {
      // best-effort
    }
  };

  if (answered) return null;

  if (submitted) {
    return (
      <p className="mt-2 text-xs italic text-muted-foreground">Thanks — that helps.</p>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-border/70 bg-secondary/40 p-2.5">
      <p className="mb-1.5 text-xs font-medium text-foreground">
        How did this refinement go?
      </p>
      <div className="mb-2 flex flex-col gap-1">
        {OPTIONS.map((option) => (
          <label key={option.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={Boolean(selected[option.key])}
              onChange={() => toggle(option.key)}
              className="rounded border-input accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={Object.keys(selected).length === 0}
        className="rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}

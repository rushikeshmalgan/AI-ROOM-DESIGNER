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
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">Thanks — that helps.</p>
    );
  }

  return (
    <div className="mt-2 p-2.5 rounded-md bg-purple-50 dark:bg-gray-800 border border-purple-100 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        How did this refinement go?
      </p>
      <div className="flex flex-col gap-1 mb-2">
        {OPTIONS.map((option) => (
          <label key={option.key} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={Boolean(selected[option.key])}
              onChange={() => toggle(option.key)}
              className="rounded border-gray-300"
            />
            {option.label}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={Object.keys(selected).length === 0}
        className="text-xs px-2.5 py-1 rounded-full bg-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-700"
      >
        Submit
      </button>
    </div>
  );
}

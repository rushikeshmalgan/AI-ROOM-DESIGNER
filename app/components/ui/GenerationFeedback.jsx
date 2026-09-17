'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analyticsClient';

const REACTIONS = [
  { emoji: '😍', label: 'Exactly what I wanted', rating: 'exact' },
  { emoji: '🙂', label: 'Pretty close', rating: 'close' },
  { emoji: '😐', label: 'Not quite', rating: 'not_quite' },
  { emoji: '😕', label: 'Very different', rating: 'very_different' },
];

const IMPROVEMENT_OPTIONS = ['Room layout', 'Style', 'Furniture', 'Colors', 'Realism', 'Other'];

function storageKey(designId) {
  return `generation-feedback-${designId}`;
}

// Shown once per design (root generations only — see DesignChain), right
// after the thing it's asking about. This is worth more than guessing
// what AI feature to build next: it's real signal about whether people
// got what they wanted. Answer is remembered in localStorage purely so
// the same viewer doesn't get asked twice on reload — it's not the
// system of record (the events table is), just a per-viewer convenience.
export default function GenerationFeedback({ designId }) {
  const [answered, setAnswered] = useState(true); // default true until we can check
  const [rating, setRating] = useState(null);

  useEffect(() => {
    try {
      setAnswered(Boolean(window.localStorage.getItem(storageKey(designId))));
    } catch {
      setAnswered(false);
    }
  }, [designId]);

  const markAnswered = () => {
    try {
      window.localStorage.setItem(storageKey(designId), '1');
    } catch {
      // best-effort — if storage isn't available, worst case is being asked again
    }
  };

  const handleRate = (option) => {
    setRating(option.rating);
    track('generation_feedback', { designId, rating: option.rating });
    if (option.rating === 'exact' || option.rating === 'close') {
      markAnswered();
    }
    // "not quite" / "very different" stay open for the follow-up category question
  };

  const handleCategory = (category) => {
    track('generation_feedback', { designId, rating, category });
    markAnswered();
  };

  if (answered) return null;

  return (
    <div className="mt-2 p-2.5 rounded-md bg-purple-50 dark:bg-gray-800 border border-purple-100 dark:border-gray-700">
      {!rating ? (
        <>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            How close was this to what you wanted?
          </p>
          <div className="flex gap-3">
            {REACTIONS.map((option) => (
              <button
                key={option.rating}
                type="button"
                onClick={() => handleRate(option)}
                title={option.label}
                className="text-xl hover:scale-110 transition-transform"
              >
                {option.emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            What should be better?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {IMPROVEMENT_OPTIONS.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategory(category)}
                className="text-xs px-2 py-1 rounded-full border border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-gray-700"
              >
                {category}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

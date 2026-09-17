'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const STAGES = [
  'Preparing your room...',
  'Applying your design preferences...',
  'Generating your redesign...',
  'Finishing touches...',
];

// Purely time-based captions, not a fake percentage bar — there's no
// real mid-generation progress signal from the provider, so this only
// ever claims generic phases that are actually true of the pipeline
// (validate -> call the model -> persist), advancing every few seconds
// and holding on the last stage rather than implying the wait is over
// before the request actually resolves.
export default function GenerationStages({ active, className = '' }) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      <p className="text-sm text-gray-600 dark:text-gray-400">{STAGES[stageIndex]}</p>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

const STAGES = [
  'Analyzing room composition',
  'Applying design direction',
  'Rendering your concept',
  'Finishing touches',
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
    <div className={`rounded-lg border border-border/70 bg-secondary/40 p-4 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Designing your space
      </p>
      <ul className="mt-3 space-y-2">
        {STAGES.map((stage, index) => {
          const done = index < stageIndex;
          const current = index === stageIndex;
          return (
            <li
              key={stage}
              className={`flex items-center gap-2.5 text-sm transition-colors duration-300 ${
                current ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  current ? 'animate-pulse bg-primary' : done ? 'bg-muted-foreground' : 'bg-border'
                }`}
              />
              {stage}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

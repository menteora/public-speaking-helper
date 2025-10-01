import React from 'react';
import { formatTimeDelta } from './Timer';

interface TimingDeltaDisplayProps {
  delta: number | null;
}

export const TimingDeltaDisplay: React.FC<TimingDeltaDisplayProps> = ({ delta }) => {
  if (delta === null) {
    return null;
  }

  const isNegative = delta < 0;

  return (
    <div 
      className="absolute bottom-6 right-6 bg-slate-800/80 backdrop-blur-sm p-2 rounded-lg text-center font-mono shadow-lg"
      title="Difference from previous session"
    >
      <div className="text-xs text-slate-400 mb-1">vs. PREVIOUS</div>
      <div className={`text-lg font-bold ${isNegative ? 'text-green-400' : 'text-red-400'}`}>
        {formatTimeDelta(delta)}
      </div>
    </div>
  );
};

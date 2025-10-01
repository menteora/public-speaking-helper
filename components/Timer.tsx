import React from 'react';
import { Play, Pause, RotateCw } from 'lucide-react';

interface TimerProps {
  elapsedTime: number;
  isRunning: boolean;
  onStartPause: () => void;
  onReset: () => void;
}

export const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatTimeDelta = (deltaSeconds: number): string => {
    const sign = deltaSeconds < 0 ? '-' : '+';
    const absSeconds = Math.abs(deltaSeconds);
    const minutes = Math.floor(absSeconds / 60);
    const seconds = absSeconds % 60;
    return `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const Timer: React.FC<TimerProps> = ({ elapsedTime, isRunning, onStartPause, onReset }) => {
  return (
    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
      <span className="font-mono text-lg text-slate-200 px-3 w-20 text-center" aria-live="polite">
        {formatTime(elapsedTime)}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onStartPause}
          className="px-2 sm:px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors text-slate-300 hover:text-white hover:bg-slate-700"
          title={isRunning ? 'Pause timer' : 'Start timer'}
          aria-label={isRunning ? 'Pause timer' : 'Start timer'}
        >
          {isRunning ? <Pause size={16} /> : <Play size={16} />}
          <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Start'}</span>
        </button>
        <button
          onClick={onReset}
          className="px-2 sm:px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors text-slate-300 hover:text-white hover:bg-slate-700"
          title="Reset timer"
          aria-label="Reset timer"
        >
          <RotateCw size={16} />
           <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import type { Speech } from '../types';
import { generateMindMapMarkup } from '../services/mindMapGenerator';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// FIX: Declare the global mermaid variable to resolve TypeScript error.
declare const mermaid: any;

interface MindMapPreviewProps {
  speech: Speech | null;
  currentMainPointIndex: number;
  onNext: () => void;
  onPrev: () => void;
}

export const MindMapPreview: React.FC<MindMapPreviewProps> = ({ speech, currentMainPointIndex, onNext, onPrev }) => {
  const [markup, setMarkup] = useState('');
  const [direction, setDirection] = useState<'LR' | 'TD'>('LR');
  const containerId = "mermaid-container";

  const mainPoint = speech?.mainPoints[currentMainPointIndex];
  const totalPoints = speech?.mainPoints.length ?? 0;

  useEffect(() => {
    const handleResize = () => {
      setDirection(window.innerWidth < 768 ? 'TD' : 'LR');
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial direction

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const generatedMarkup = generateMindMapMarkup(mainPoint ?? null, direction);
    setMarkup(generatedMarkup);
  }, [mainPoint, direction]);

  useEffect(() => {
    // When markup changes, re-run mermaid
    if (markup) {
      const element = document.getElementById(containerId);
      if (element) {
        element.removeAttribute('data-processed');
        element.innerHTML = markup;
        try {
          mermaid.run({ nodes: [element] });
        } catch (e) {
            console.error("Mermaid rendering error:", e)
        }
      }
    }
  }, [markup, containerId]);

  return (
    <div className="flex flex-col bg-slate-800 rounded-lg shadow-lg h-full overflow-hidden">
        <div className="p-3 bg-slate-700/default rounded-t-lg border-b border-slate-600 flex justify-between items-center">
            <h2 className="text-lg font-bold text-sky-300">Structure View</h2>
            {speech?.title && (
              <h3 className="text-md font-semibold text-slate-300 truncate pl-4">{speech.title}</h3>
            )}
        </div>
        <div className="flex-grow p-6 overflow-auto custom-scrollbar flex items-center justify-center">
            <div id={containerId} className="mermaid w-full h-full">
                {/* Mermaid will render here */}
            </div>
        </div>

        {totalPoints > 0 && (
         <div className="p-4 border-t border-slate-600 flex justify-between items-center bg-slate-800/50">
          <button 
            onClick={onPrev} 
            disabled={currentMainPointIndex === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <span className="font-mono text-sm text-slate-400">
            {currentMainPointIndex + 1} / {totalPoints}
          </span>
          <button 
            onClick={onNext} 
            disabled={currentMainPointIndex >= totalPoints - 1}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #1e293b; /* slate-800 */
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569; /* slate-600 */
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #64748b; /* slate-500 */
          }
          .mermaid svg {
            max-width: none !important; /* Override mermaid default styles for better scaling */
            max-height: 100%;
          }
        `}</style>
    </div>
  );
};
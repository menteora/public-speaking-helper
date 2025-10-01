import React, { useRef, useState, useEffect } from 'react';
import type { Speech, Point } from '../types';
import { ChevronLeft, ChevronRight, Pencil, History } from 'lucide-react';
import { formatTime, formatTimeDelta } from './Timer';
import { marked } from 'marked';

interface CueCardPreviewProps {
  speech: Speech | null;
  currentMainPointIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onEditSection: () => void;
  onJumpToTime: (time: number) => void;
}

// Renderer for markdown content, adapted for a light theme
const ContentRenderer: React.FC<{ html: string }> = ({ html }) => {
  const processedHtml = marked.parse(html);
  return (
    <div
      className="prose prose-slate max-w-none text-lg" // Larger text for readability
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

// Renderer for sub-points, adapted for a light theme
const PointRenderer: React.FC<{ point: Point; isTopLevel?: boolean }> = ({ point, isTopLevel = false }) => {
  const headingClasses: { [key: number]: string } = {
    3: "text-3xl font-bold text-sky-800 mb-2",
    4: "text-2xl font-semibold text-sky-700 mt-6 mb-1",
    5: "text-xl font-semibold text-slate-800 mt-5 mb-1",
    6: "text-lg font-medium text-slate-700 mt-4 mb-1",
  };
  
  const containerClasses = isTopLevel 
    ? "bg-white/50 p-6 rounded-lg border border-slate-200"
    : "ml-4 pl-4 border-l-2 border-slate-300 mt-4";

  const HeadingTag = `h${point.level}` as React.ElementType;

  return (
    <div className={containerClasses}>
      <HeadingTag className={headingClasses[point.level] || 'text-xl font-bold'}>{point.title}</HeadingTag>
      
      <div className="space-y-3">
        {point.content.map((item, i) => (
          <ContentRenderer key={i} html={item.html} />
        ))}
      </div>
      
      {point.subPoints?.length > 0 && (
        <div className="mt-3 space-y-3">
          {point.subPoints.map((subPoint, index) => (
            <PointRenderer key={index} point={subPoint} />
          ))}
        </div>
      )}
    </div>
  );
};


export const CueCardPreview: React.FC<CueCardPreviewProps> = ({ speech, currentMainPointIndex, onNext, onPrev, onEditSection, onJumpToTime }) => {
  const mainPoint = speech?.mainPoints[currentMainPointIndex];
  const totalPoints = speech?.mainPoints.length ?? 0;
  
  const hasContent = mainPoint && (mainPoint.content.length > 0 || mainPoint.subPoints.length > 0);

  const hasCurrentTime = mainPoint?.timestamp !== undefined;
  const hasPreviousTime = mainPoint?.previousTimestamp !== undefined;
  const delta = hasCurrentTime && hasPreviousTime ? mainPoint.timestamp! - mainPoint.previousTimestamp! : 0;

  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [animationClass, setAnimationClass] = useState('animate-fade-in');

  useEffect(() => {
    // Reset to fade-in when the component mounts or content is empty
    setAnimationClass('animate-fade-in');
  }, [currentMainPointIndex]);

  const handleNextWithAnimation = () => {
    setAnimationClass('animate-slide-out-left');
    setTimeout(() => {
      onNext();
      // The useEffect will set the new card to fade-in
    }, 200);
  };
  
  const handlePrevWithAnimation = () => {
    setAnimationClass('animate-slide-out-right');
    setTimeout(() => {
      onPrev();
    }, 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    if (Math.abs(deltaX) > 50) { // Swipe threshold
      if (deltaX < 0 && currentMainPointIndex < totalPoints - 1) {
        handleNextWithAnimation();
      } else if (deltaX > 0 && currentMainPointIndex > 0) {
        handlePrevWithAnimation();
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) {
        return; // Ignore clicks on buttons or links inside the card
    }

    if (cardRef.current) {
      const { left, width } = cardRef.current.getBoundingClientRect();
      const clickX = e.clientX - left;

      if (clickX > width / 2 && currentMainPointIndex < totalPoints - 1) {
        handleNextWithAnimation();
      } else if (clickX < width / 2 && currentMainPointIndex > 0) {
        handlePrevWithAnimation();
      }
    }
  };

  return (
    <div 
        className="relative flex-grow flex flex-col items-center justify-center px-4 md:px-20"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
    >

      {mainPoint ? (
        <div 
          ref={cardRef}
          key={currentMainPointIndex} // Ensures component re-renders for animation
          className={`w-full max-w-4xl h-full flex flex-col bg-slate-100 text-slate-900 rounded-lg shadow-2xl p-6 md:p-10 ${animationClass}`}
        >
          
          {hasCurrentTime && (
            <div className="absolute top-6 right-8 text-right font-mono text-sm pointer-events-none">
              <div className="text-slate-600" title="Current time for this slide">
                {formatTime(mainPoint.timestamp!)}
              </div>
              {hasPreviousTime && (
                <>
                  <div className="text-slate-400" title="Previous time for this slide">
                    {formatTime(mainPoint.previousTimestamp!)}
                  </div>
                  <div 
                    className={`font-bold ${delta > 0 ? 'text-red-500' : 'text-green-500'}`}
                    title="Difference from previous time"
                  >
                    {formatTimeDelta(delta)}
                  </div>
                </>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-start gap-4 mb-6 pb-4 border-b-2 border-slate-300">
            <h2 className="text-4xl md:text-5xl font-extrabold text-sky-700 break-words">
              {mainPoint.title}
            </h2>
            <button
                onClick={(e) => { e.stopPropagation(); onEditSection(); }}
                className="text-slate-500 hover:text-sky-600 transition-colors p-2 rounded-full hover:bg-slate-200 shrink-0"
                title="Edit this section"
            >
                <Pencil size={24} />
            </button>
          </div>
          <div className="overflow-y-auto flex-grow custom-scrollbar-light pr-4 -mr-4">
            {hasContent ? (
              <>
                <div className="space-y-4 mb-6">
                  {mainPoint.content.map((item, i) => (
                    <ContentRenderer key={`main-content-${i}`} html={item.html} />
                  ))}
                </div>
                <div className="space-y-8">
                  {mainPoint.subPoints.map((subPoint, subIndex) => (
                    <PointRenderer key={subIndex} point={subPoint} isTopLevel={true} />
                  ))}
                </div>
              </>
            ) : (
                <p className="text-xl text-slate-500 italic">This section has no additional content.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-500">
            <p className="text-lg font-semibold">Select a section to see your cue card.</p>
            <p>Cue cards show your markdown content formatted for easy reading.</p>
        </div>
      )}

      {totalPoints > 1 && (
        <>
          <button 
            onClick={handlePrevWithAnimation} 
            disabled={currentMainPointIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 hidden md:flex items-center justify-center bg-slate-700/60 text-white rounded-full font-semibold hover:bg-slate-600 transition-all disabled:opacity-0 disabled:cursor-not-allowed"
            title="Previous"
            aria-label="Previous Card"
          >
            <ChevronLeft size={32} />
          </button>
           <button 
            onClick={handleNextWithAnimation} 
            disabled={currentMainPointIndex >= totalPoints - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 hidden md:flex items-center justify-center bg-slate-700/60 text-white rounded-full font-semibold hover:bg-slate-600 transition-all disabled:opacity-0 disabled:cursor-not-allowed"
            title="Next"
            aria-label="Next Card"
          >
            <ChevronRight size={32} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full">
            <span className="font-mono text-sm">
                {currentMainPointIndex + 1} / {totalPoints}
            </span>
          </div>
        </>
      )}

      {mainPoint?.timestamp !== undefined && (
        <button
          onClick={(e) => { e.stopPropagation(); onJumpToTime(mainPoint.timestamp as number); }}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-700/80 text-white rounded-full font-semibold hover:bg-slate-600 transition-all"
          title={`Jump to ${formatTime(mainPoint.timestamp)}`}
          aria-label={`Jump to saved time ${formatTime(mainPoint.timestamp)}`}
        >
          <History size={16} />
          <span className="font-mono text-sm">{formatTime(mainPoint.timestamp)}</span>
        </button>
      )}

       <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        .animate-slide-out-left {
          animation: slideOutLeft 0.2s ease-in forwards;
        }
        .animate-slide-out-right {
          animation: slideOutRight 0.2s ease-in forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideOutLeft {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(-50px); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(50px); }
        }

        .custom-scrollbar-light::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar-light::-webkit-scrollbar-track {
          background: #e2e8f0; /* slate-200 */
        }
        .custom-scrollbar-light::-webkit-scrollbar-thumb {
          background: #94a3b8; /* slate-400 */
          border-radius: 4px;
        }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover {
          background: #64748b; /* slate-500 */
        }
      `}</style>
    </div>
  );
};
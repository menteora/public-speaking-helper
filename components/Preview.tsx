import React from 'react';
import type { Speech, Point } from '../types';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';

declare const marked: any;

interface PreviewProps {
  speech: Speech | null;
  currentMainPointIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onEditSection: () => void;
}

const ContentRenderer: React.FC<{ html: string }> = ({ html }) => {
  const processedHtml = marked.parse(html);
  return (
    <div
      className="prose prose-invert prose-sm text-slate-300 max-w-none"
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

const PointRenderer: React.FC<{ point: Point; isTopLevel?: boolean }> = ({ point, isTopLevel = false }) => {
  const headingClasses: { [key: number]: string } = {
    3: "text-xl font-bold text-sky-200 mb-2",
    4: "text-lg font-semibold text-sky-100 mt-4 mb-1",
    5: "text-base font-semibold text-slate-200 mt-3 mb-1",
    6: "text-base font-medium text-slate-300 mt-3 mb-1",
  };
  
  const containerClasses = isTopLevel 
    ? "bg-slate-900/50 p-4 rounded-md border border-slate-700 shadow-inner"
    : "ml-2 pl-4 border-l-2 border-slate-700/50 mt-4";

  const HeadingTag = `h${point.level}` as React.ElementType;

  return (
    <div className={containerClasses}>
      <HeadingTag className={headingClasses[point.level] || 'text-lg font-bold'}>{point.title}</HeadingTag>
      
      <div className="space-y-2">
        {point.content.map((item, i) => (
          <ContentRenderer key={i} html={item.html} />
        ))}
      </div>
      
      {point.subPoints?.length > 0 && (
        <div className="mt-2 space-y-2">
          {point.subPoints.map((subPoint, index) => (
            <PointRenderer key={index} point={subPoint} />
          ))}
        </div>
      )}
    </div>
  );
};


export const Preview: React.FC<PreviewProps> = ({ speech, currentMainPointIndex, onNext, onPrev, onEditSection }) => {
  const mainPoint = speech?.mainPoints[currentMainPointIndex];
  const totalPoints = speech?.mainPoints.length ?? 0;
  const hasContent = mainPoint;
  
  return (
    <div className="flex flex-col bg-slate-800 rounded-lg shadow-lg h-full overflow-hidden">
      <div className="p-3 bg-slate-700/50 rounded-t-lg border-b border-slate-600 flex justify-between items-center">
        <h2 className="text-lg font-bold text-sky-300">Preview</h2>
        {speech?.title && (
          <h3 className="text-md font-semibold text-slate-300 truncate pl-4">{speech.title}</h3>
        )}
      </div>

      <div 
        className={`flex-grow p-6 overflow-y-auto custom-scrollbar ${hasContent ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          // Do not navigate if a link or button within the content is clicked
          if ((e.target as HTMLElement).closest('a, button')) {
            return;
          }
          if (hasContent) {
            onNext();
          }
        }}
      >
        {hasContent ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-slate-600">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-blue-400">
                {mainPoint.title}
              </h2>
              <button 
                onClick={onEditSection} 
                className="text-slate-400 hover:text-sky-300 transition-colors p-2 rounded-full hover:bg-slate-700"
                title="Edit this section"
              >
                <Pencil size={20} />
              </button>
            </div>
            {/* Direct content for H2 */}
            <div className="space-y-2 mb-6">
              {mainPoint.content.map((item, i) => (
                <ContentRenderer key={`main-content-${i}`} html={item.html} />
              ))}
            </div>
            <div className="space-y-6">
              {mainPoint.subPoints.map((subPoint, subIndex) => (
                <PointRenderer key={subIndex} point={subPoint} isTopLevel={true} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <p className="text-lg font-semibold">Your speech preview will appear here.</p>
              <p>Use H1 for the title, H2 for main points, and H3-H6 for sub-points.</p>
            </div>
          </div>
        )}
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
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
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
      `}</style>
    </div>
  );
};
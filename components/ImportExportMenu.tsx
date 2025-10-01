import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Book, FileText, ChevronDown } from 'lucide-react';

interface ImportExportMenuProps {
  onMarkdownImport: () => void;
  onMarkdownExport: () => void;
  onMindMapPdfExport: () => void;
  onEpubExport: () => void;
  onDocxExport: () => void;
  isExportingPdf: boolean;
  pdfExportProgress: string;
}

export const ImportExportMenu: React.FC<ImportExportMenuProps> = ({
  onMarkdownImport,
  onMarkdownExport,
  onMindMapPdfExport,
  onEpubExport,
  onDocxExport,
  isExportingPdf,
  pdfExportProgress,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Download size={16} />
        <span className="hidden sm:inline">Import / Export</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-20 animate-fade-in-down">
          <ul className="py-2">
            <li>
              <button
                onClick={() => handleAction(onMarkdownImport)}
                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Upload size={16} />
                <span>Import from Markdown...</span>
              </button>
            </li>
            <li className="my-1">
                <hr className="border-slate-700" />
            </li>
            <li>
              <button
                onClick={() => handleAction(onMarkdownExport)}
                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <FileText size={16} />
                <span>Export as Markdown...</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleAction(onDocxExport)}
                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <FileText size={16} />
                <span>Export as Word (.docx)...</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => handleAction(onEpubExport)}
                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Book size={16} />
                <span>Export as ePub...</span>
              </button>
            </li>
             <li className="my-1">
                <hr className="border-slate-700" />
            </li>
             <li>
              <button
                onClick={() => handleAction(onMindMapPdfExport)}
                disabled={isExportingPdf}
                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={16} />
                <span>{isExportingPdf ? pdfExportProgress : 'Export Structure as PDF...'}</span>
              </button>
            </li>
          </ul>
        </div>
      )}
       <style>{`
        .animate-fade-in-down {
          animation: fadeInDown 0.2s ease-out;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
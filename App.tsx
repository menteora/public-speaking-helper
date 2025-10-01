import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import * as docx from 'docx';
import saveAs from 'file-saver';
import { marked } from 'marked';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import mermaid from 'mermaid';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { parseMarkdownToSpeech } from './services/markdownParser';
import type { Speech, Point } from './types';
import { PRESET_MARKDOWN } from './constants';
import { SectionEditorModal } from './components/SectionEditorModal';
import { MindMapPreview } from './components/MindMapPreview';
import { CueCardPreview } from './components/CueCardPreview';
import { Presentation, List, Download, FilePenLine, Upload, SquareCheckBig, RotateCcw } from 'lucide-react';
import { generateEpub } from './services/epubGenerator';
import { generateMindMapMarkup } from './services/mindMapGenerator';
import { Timer } from './components/Timer';
import { ImportExportMenu } from './components/ImportExportMenu';
import { TimingDeltaDisplay } from './components/TimingDeltaDisplay';

const LOCAL_STORAGE_MARKDOWN_KEY = 'psh-markdown';
const LOCAL_STORAGE_INDEX_KEY = 'psh-index';
const LOCAL_STORAGE_TIMINGS_KEY = 'psh-timings';


const App: React.FC = () => {
  const [markdown, setMarkdown] = useState<string>(() => {
    try {
      const savedMarkdown = window.localStorage.getItem(LOCAL_STORAGE_MARKDOWN_KEY);
      return savedMarkdown !== null ? savedMarkdown : PRESET_MARKDOWN;
    } catch (e) {
      console.error("Failed to read markdown from local storage", e);
      return PRESET_MARKDOWN;
    }
  });
  const [speech, setSpeech] = useState<Speech | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'present'>('present');
  const [previewMode, setPreviewMode] = useState<'slide' | 'mindmap' | 'cuecard'>('cuecard');
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [currentMainPointIndex, setCurrentMainPointIndex] = useState<number>(() => {
    try {
      const savedIndex = window.localStorage.getItem(LOCAL_STORAGE_INDEX_KEY);
      const parsedIndex = savedIndex !== null ? parseInt(savedIndex, 10) : 0;
      return isNaN(parsedIndex) ? 0 : parsedIndex;
    } catch (e) {
      console.error("Failed to read index from local storage", e);
      return 0;
    }
  });
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [pdfExportProgress, setPdfExportProgress] = useState('');

  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timings, setTimings] = useState<{ previous: { [key: string]: number }, current: { [key: string]: number } }>(() => {
    try {
      const savedTimings = window.localStorage.getItem(LOCAL_STORAGE_TIMINGS_KEY);
      return savedTimings ? JSON.parse(savedTimings) : { previous: {}, current: { '0': 0 } };
    } catch (e) {
      console.error("Failed to read timings from local storage", e);
      return { previous: {}, current: { '0': 0 } };
    }
  });

  useEffect(() => {
    // Initialize mermaid if available
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      flowchart: {
          nodeSpacing: 50,
          rankSpacing: 35, // Compact horizontal spacing
      }
    });
  }, []);
  
  // Save markdown to local storage
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_MARKDOWN_KEY, markdown);
    } catch (e) {
      console.error("Failed to save markdown to local storage", e);
    }
  }, [markdown]);

  // Save current index to local storage
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_INDEX_KEY, currentMainPointIndex.toString());
    } catch (e) {
      console.error("Failed to save index from local storage", e);
    }
  }, [currentMainPointIndex]);

  // Save timings to local storage
  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_TIMINGS_KEY, JSON.stringify(timings));
    } catch (e) {
      console.error("Failed to save timings to local storage", e);
    }
  }, [timings]);

  useEffect(() => {
    const parsedSpeech = parseMarkdownToSpeech(markdown);
    if (parsedSpeech.mainPoints.length > 0) {
        parsedSpeech.mainPoints.forEach((point, index) => {
            point.timestamp = timings.current[index];
            point.previousTimestamp = timings.previous[index];
        });
    }
    setSpeech(parsedSpeech);
  }, [markdown, timings]);
  
  useEffect(() => {
      if (speech && currentMainPointIndex >= speech.mainPoints.length) {
          setCurrentMainPointIndex(Math.max(0, speech.mainPoints.length - 1));
      }
  }, [speech, currentMainPointIndex]);

  // Timer effect
  useEffect(() => {
    let interval: number | undefined;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [isTimerRunning]);

  const handleTimerStartPause = () => {
    // FIX: Changed `isRunning` to `isTimerRunning` to reference the correct state variable.
    if (isTimerRunning && speech && currentMainPointIndex === speech.mainPoints.length - 1) {
        // This is the manual stop on the last slide, marking the end of the session.
        setTimings(prev => ({
            ...prev,
            current: { ...prev.current, totalTime: elapsedTime }
        }));
    }
    setIsTimerRunning(prev => !prev);
  };
  
  const handleTimerReset = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setTimings(prev => ({
      // The completed 'current' session moves to 'previous'.
      previous: { ...prev.current }, 
      // Start a fresh 'current' session.
      current: { '0': 0 }
    }));
  };

  const handleRestartPresentation = () => {
    // The `window.confirm` was removed because it is not supported in the sandboxed environment.
    handleTimerReset();
    setCurrentMainPointIndex(0);
  };

  const handleJumpToTime = (time: number) => {
    setElapsedTime(time);
    if (!isTimerRunning) {
      setIsTimerRunning(true);
    }
  };

  const handleNavigation = (newIndex: number) => {
    if (!speech) return;

    if (timings.current[newIndex] === undefined) {
      setTimings(prev => ({
        ...prev,
        current: { ...prev.current, [newIndex]: elapsedTime }
      }));
    }

    setCurrentMainPointIndex(newIndex);
  };

  const handleNext = () => {
    if (speech && currentMainPointIndex < speech.mainPoints.length - 1) {
      handleNavigation(currentMainPointIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentMainPointIndex > 0) {
      handleNavigation(currentMainPointIndex - 1);
    }
  };

  const getMarkdownForSection = (index: number): string => {
    const sections = markdown.split(/^(?=##\s)/m);
    const titleSection = sections[0];
    const mainSections = sections.slice(1);
    const combined = [titleSection.match(/#\s.*/)?.[0] || '', ...mainSections];

    const h1AndFollowingSections = markdown.split(/^(?=##\s)/m);
    const contentSections = h1AndFollowingSections.slice(1);
    return contentSections[index] || '';
  }

  const handleSaveSection = (newSectionMarkdown: string, index: number) => {
    const h1AndFollowingSections = markdown.split(/^(?=##\s)/m);
    const titlePart = h1AndFollowingSections[0];
    const contentParts = h1AndFollowingSections.slice(1);

    if (index < 0 || index >= contentParts.length) return;

    contentParts[index] = newSectionMarkdown;
    
    setMarkdown(titlePart + contentParts.join(''));
    setEditingSectionIndex(null);
  };
  
  const handleEpubExport = () => {
    generateEpub(speech);
  };
  
  const handleMindMapPdfExport = async () => {
    if (!speech || speech.mainPoints.length === 0) {
        alert("No content to export.");
        return;
    }

    const renderContainer = document.getElementById('pdf-render-container');
    if (!renderContainer) {
        alert("PDF render container not found.");
        return;
    }

    setIsPdfExporting(true);
    setPdfExportProgress('Initializing...');

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const totalPoints = speech.mainPoints.length;

    try {
        for (let i = 0; i < totalPoints; i++) {
            const point = speech.mainPoints[i];
            setPdfExportProgress(`Processing page ${i + 1} of ${totalPoints}...`);
            
            // 1. Generate Markup and render off-screen
            const markup = generateMindMapMarkup(point, 'LR');
            renderContainer.innerHTML = markup;
            renderContainer.removeAttribute('data-processed');
            
            await mermaid.run({ nodes: [renderContainer] });
            // Small delay to ensure mermaid has finished rendering SVG
            await new Promise(resolve => setTimeout(resolve, 500));

            // 2. Capture with html2canvas
            const canvas = await html2canvas(renderContainer, {
                scale: 2,
                backgroundColor: '#1e293b',
                useCORS: true,
            });

            // 3. Add to PDF
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = 297;
            const pdfHeight = 210;
            const margin = 15; // 15mm margin on each side

            const availableWidth = pdfWidth - (margin * 2);
            const availableHeight = pdfHeight - (margin * 2);

            const imgProps = { width: canvas.width, height: canvas.height };
            const imgRatio = imgProps.width / imgProps.height;
            
            let finalImgWidth, finalImgHeight;
            if (imgRatio > (availableWidth / availableHeight)) {
                finalImgWidth = availableWidth;
                finalImgHeight = finalImgWidth / imgRatio;
            } else {
                finalImgHeight = availableHeight;
                finalImgWidth = finalImgHeight * imgRatio;
            }

            const xOffset = (pdfWidth - finalImgWidth) / 2;
            const yOffset = (pdfHeight - finalImgHeight) / 2;

            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalImgWidth, finalImgHeight);
        }
        
        const title = speech?.title || "mind-map";
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        pdf.save(`${sanitizedTitle}_structure.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Could not generate PDF. An unexpected error occurred.");
    } finally {
        setIsPdfExporting(false);
        setPdfExportProgress('');
        renderContainer.innerHTML = ''; // Clean up
    }
  };

  const handleMarkdownExport = () => {
    if (!markdown.trim()) {
      alert("There's nothing to export.");
      return;
    }

    const title = speech?.title || "speech";
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, `${sanitizedTitle}.md`);
  };

  const handleDocxExport = async () => {
    if (!speech) {
      alert("There's nothing to export.");
      return;
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

    try {
        const docChildren: any[] = [];

        if (speech.title) {
            docChildren.push(new Paragraph({
                text: speech.title,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }));
        }

        // FIX: 'TextRun' is a value, not a type. Use 'any[]' instead.
        const parseInlinesToTextRuns = (text: string): any[] => {
            const runs: any[] = [];
            const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter(p => p);

            for (const part of parts) {
                if (part.startsWith('**') && part.endsWith('**')) {
                    runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
                } else if (part.startsWith('*') && part.endsWith('*')) {
                    runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
                } else if (part.trim().length > 0) {
                    runs.push(new TextRun(part));
                }
            }
            return runs;
        };
        
        const processPoint = (point: Point) => {
            // FIX: 'HeadingLevel' is a value, not a type. Use 'any' instead.
            const headingLevels: { [key: number]: any } = {
                2: HeadingLevel.HEADING_1,
                3: HeadingLevel.HEADING_2,
                4: HeadingLevel.HEADING_3,
                5: HeadingLevel.HEADING_4,
                6: HeadingLevel.HEADING_5,
            };
            const headingLevel = headingLevels[point.level] || HeadingLevel.HEADING_6;

            docChildren.push(new Paragraph({
                text: point.title,
                heading: headingLevel,
                spacing: { after: 200 },
            }));

            point.content.forEach(item => {
                switch (item.type) {
                    case 'paragraph':
                        docChildren.push(new Paragraph({ children: parseInlinesToTextRuns(item.html), spacing: { after: 120 } }));
                        break;
                    case 'blockquote':
                        const fullQuoteText = item.html.replace(/^\s*>\s?/gm, '');
                        docChildren.push(new Paragraph({
                            children: parseInlinesToTextRuns(fullQuoteText),
                            style: "Quote",
                            spacing: { after: 120 }
                        }));
                        break;
                    case 'list':
                        const listItems = item.html.split('\n').filter(line => line.trim().match(/^(\*|-)\s/));
                        listItems.forEach((li, index) => {
                            const text = li.replace(/^(\*|-)\s+/, '');
                            docChildren.push(new Paragraph({
                                children: parseInlinesToTextRuns(text),
                                bullet: { level: 0 },
                                spacing: { after: index === listItems.length - 1 ? 120 : 0 }
                            }));
                        });
                        break;
                }
            });

            if(point.subPoints) {
                point.subPoints.forEach(processPoint);
            }
        };

        speech.mainPoints.forEach(processPoint);

        const doc = new Document({
            sections: [{
                children: docChildren,
            }],
        });
        
        const blob = await Packer.toBlob(doc);
        const title = speech?.title || "speech";
        const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        saveAs(blob, `${sanitizedTitle}.docx`);

    } catch (error) {
        console.error("Error during DOCX export:", error);
        alert("An error occurred while creating the Word document. Please check the console for details.");
    }
  };

  const handleMarkdownImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content !== null) {
            setMarkdown(content);
          }
        };
        reader.onerror = () => {
          alert('Error reading file.');
        }
        reader.readAsText(file);
      }
    };
    input.click();
  };


  if (viewMode === 'edit') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 lg:p-6 flex flex-col">
         <header className="text-center mb-6">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
            Public Speaking Helper
          </h1>
          <p className="text-slate-400 mt-2">
            Edit your full speech below. The editor will grow with your text.
          </p>
        </header>
        <main className="flex flex-col">
          <Editor value={markdown} onChange={setMarkdown} />
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
             <ImportExportMenu
              onMarkdownImport={handleMarkdownImport}
              onMarkdownExport={handleMarkdownExport}
              onMindMapPdfExport={handleMindMapPdfExport}
              onEpubExport={handleEpubExport}
              onDocxExport={handleDocxExport}
              isExportingPdf={isPdfExporting}
              pdfExportProgress={pdfExportProgress}
            />
            <button
              onClick={() => {
                setViewMode('present');
                setCurrentMainPointIndex(0);
              }}
              className="px-8 py-3 bg-sky-600 text-white rounded-md font-bold text-lg hover:bg-sky-500 transition-transform transform hover:scale-105"
            >
              Present
            </button>
          </div>
        </main>
      </div>
    );
  }

  const renderPreview = () => {
    switch(previewMode) {
      case 'slide':
        return (
          <Preview
            speech={speech}
            currentMainPointIndex={currentMainPointIndex}
            onNext={handleNext}
            onPrev={handlePrev}
            onEditSection={() => setEditingSectionIndex(currentMainPointIndex)}
          />
        );
      case 'mindmap':
        return (
          <MindMapPreview 
            speech={speech}
            currentMainPointIndex={currentMainPointIndex}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        );
      case 'cuecard':
        return (
          <CueCardPreview 
            speech={speech}
            currentMainPointIndex={currentMainPointIndex}
            onNext={handleNext}
            onPrev={handlePrev}
            onEditSection={() => setEditingSectionIndex(currentMainPointIndex)}
            onJumpToTime={handleJumpToTime}
          />
        );
      default:
        return null;
    }
  };

  const mainPoint = speech?.mainPoints[currentMainPointIndex];
  const hasCurrentTime = mainPoint?.timestamp !== undefined;
  const hasPreviousTime = mainPoint?.previousTimestamp !== undefined;
  const delta = hasCurrentTime && hasPreviousTime ? mainPoint.timestamp! - mainPoint.previousTimestamp! : null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 lg:p-6 flex flex-col">
       <div id="pdf-render-container" style={{ position: 'absolute', left: '-9999px', width: '1280px', height: '720px', backgroundColor: '#1e293b' }}></div>
      <header className="mb-6 flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 text-center md:text-left">
          Presentation Mode
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
            <Timer
              elapsedTime={elapsedTime}
              isRunning={isTimerRunning}
              onStartPause={handleTimerStartPause}
              onReset={handleTimerReset}
            />
            <div className="bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-slate-700">
                <button 
                    onClick={() => setPreviewMode('slide')}
                    className={`px-2 sm:px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors ${previewMode === 'slide' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Slide View"
                >
                    <Presentation size={16}/>
                    <span className="hidden sm:inline">Slide View</span>
                </button>
                 <button 
                    onClick={() => setPreviewMode('mindmap')}
                    className={`px-2 sm:px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors ${previewMode === 'mindmap' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Structure View"
                >
                    <List size={16}/>
                    <span className="hidden sm:inline">Structure View</span>
                </button>
                 <button 
                    onClick={() => setPreviewMode('cuecard')}
                    className={`px-2 sm:px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors ${previewMode === 'cuecard' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Cue Card View"
                >
                    <SquareCheckBig size={16}/>
                    <span className="hidden sm:inline">Cue Card</span>
                </button>
            </div>
            <ImportExportMenu
              onMarkdownImport={handleMarkdownImport}
              onMarkdownExport={handleMarkdownExport}
              onMindMapPdfExport={handleMindMapPdfExport}
              onEpubExport={handleEpubExport}
              onDocxExport={handleDocxExport}
              isExportingPdf={isPdfExporting}
              pdfExportProgress={pdfExportProgress}
            />
            <button
              onClick={handleRestartPresentation}
              className="px-3 sm:px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 transition-colors flex items-center gap-2"
              title="Ricomincia la presentazione"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">Ricomincia</span>
            </button>
            <button
            onClick={() => setViewMode('edit')}
            className="px-3 sm:px-4 py-2 bg-slate-700 text-white rounded-md font-semibold hover:bg-slate-600 transition-colors flex items-center gap-2"
            title="Edit Speech"
            >
            <FilePenLine size={16} />
            <span className="hidden sm:inline">Edit Speech</span>
            </button>
        </div>
      </header>
      <main className="flex-grow flex flex-col relative">
        {renderPreview()}
        <TimingDeltaDisplay delta={delta} />
      </main>
      {editingSectionIndex !== null && (
        <SectionEditorModal
          sectionMarkdown={getMarkdownForSection(editingSectionIndex)}
          onSave={(newMarkdown) => handleSaveSection(newMarkdown, editingSectionIndex)}
          onClose={() => setEditingSectionIndex(null)}
        />
      )}
    </div>
  );
};

export default App;
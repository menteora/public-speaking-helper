import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { CaseUpper, CaseLower, Bold, Italic, Underline, Heading1, Heading2, Heading3, Heading4, ALargeSmall, Quote } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

const toSentenceCase = (text: string): string => {
    const firstCharIndex = text.search(/\S/);
    if (firstCharIndex === -1) {
        return text.toLowerCase();
    }
    const leadingSpaces = text.substring(0, firstCharIndex);
    const firstChar = text.charAt(firstCharIndex).toUpperCase();
    const restOfString = text.substring(firstCharIndex + 1).toLowerCase();
    return leadingSpaces + firstChar + restOfString;
};

export const Editor: React.FC<EditorProps> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{start: number, end: number} | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to recalculate
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  useLayoutEffect(() => {
    // Restore selection after programmatic change
    if (selectionRef.current && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
      selectionRef.current = null; // Clear after use
    }
  }, [value]);

  const handleTextTransform = (transformType: 'uppercase' | 'lowercase') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: textareaValue } = textarea;

    if (selectionStart === selectionEnd) return; // No text selected

    const selectedText = textareaValue.substring(selectionStart, selectionEnd);
    const transformedText = transformType === 'uppercase' ? selectedText.toUpperCase() : selectedText.toLowerCase();

    const newValue = 
      textareaValue.substring(0, selectionStart) +
      transformedText +
      textareaValue.substring(selectionEnd);
    
    onChange(newValue);
    
    // Store selection to be restored in the post-render useLayoutEffect
    selectionRef.current = { start: selectionStart, end: selectionEnd };
  };

  const handleSentenceCase = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart === selectionEnd) return;

    const selectedText = value.substring(selectionStart, selectionEnd);
    let transformedText = '';

    const hashIndex = selectedText.lastIndexOf('#');
    
    if (hashIndex !== -1) {
        const prefixPart = selectedText.substring(0, hashIndex + 1);
        const contentPart = selectedText.substring(hashIndex + 1);
        transformedText = prefixPart + toSentenceCase(contentPart);
    } else {
        transformedText = toSentenceCase(selectedText);
    }
    
    const newValue = 
      value.substring(0, selectionStart) +
      transformedText +
      value.substring(selectionEnd);
    
    onChange(newValue);
    
    selectionRef.current = { start: selectionStart, end: selectionEnd };
  };

  const handleMarkdownFormatting = (formatType: 'bold' | 'italic' | 'underline') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart === selectionEnd) return;

    const selectedText = value.substring(selectionStart, selectionEnd);
    let formattedText = '';

    switch(formatType) {
        case 'bold':
            formattedText = `**${selectedText}**`;
            break;
        case 'italic':
            formattedText = `*${selectedText}*`;
            break;
        case 'underline':
            formattedText = `<u>${selectedText}</u>`;
            break;
    }

    const newValue = 
      value.substring(0, selectionStart) +
      formattedText +
      value.substring(selectionEnd);
    
    onChange(newValue);
    
    selectionRef.current = { start: selectionStart, end: selectionStart + formattedText.length };
  };

  const handleBlockquoteFormatting = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // If no text is selected, format the current line
    if (selectionStart === selectionEnd) {
        const lineStartIndex = value.lastIndexOf('\n', selectionStart - 1) + 1;
        let lineEndIndex = value.indexOf('\n', selectionStart);
        if (lineEndIndex === -1) {
            lineEndIndex = value.length;
        }

        const originalLine = value.substring(lineStartIndex, lineEndIndex);
        
        // Check if it's already a blockquote to toggle it off
        if (originalLine.trim().startsWith('>')) {
            const newLine = originalLine.replace(/^\s*>\s?/, '');
            const newValue = value.substring(0, lineStartIndex) + newLine + value.substring(lineEndIndex);
            const lengthDifference = newLine.length - originalLine.length;
            onChange(newValue);
            selectionRef.current = { 
                start: selectionStart + lengthDifference, 
                end: selectionEnd + lengthDifference 
            };
        } else {
            const newLine = '> ' + originalLine;
            const newValue = value.substring(0, lineStartIndex) + newLine + value.substring(lineEndIndex);
            const lengthDifference = newLine.length - originalLine.length;
            onChange(newValue);
            selectionRef.current = { 
                start: selectionStart + lengthDifference, 
                end: selectionEnd + lengthDifference 
            };
        }
        return;
    }

    const selectedText = value.substring(selectionStart, selectionEnd);
    const lines = selectedText.split('\n');
    
    // Check if all selected lines are already blockquotes
    const allAreBlockquotes = lines.every(line => line.trim().startsWith('>') || line.trim() === '');

    let formattedText;
    if (allAreBlockquotes) {
        // Remove blockquote format
        formattedText = lines.map(line => line.replace(/^\s*>\s?/, '')).join('\n');
    } else {
        // Add blockquote format
        formattedText = lines.map(line => '> ' + line).join('\n');
    }

    const newValue =
        value.substring(0, selectionStart) +
        formattedText +
        value.substring(selectionEnd);

    onChange(newValue);

    selectionRef.current = { start: selectionStart, end: selectionStart + formattedText.length };
  };

  const handleHeadingFormatting = (level: 1 | 2 | 3 | 4) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // Find the start of the line
    const lineStartIndex = value.lastIndexOf('\n', selectionStart - 1) + 1;

    // Find the end of the line
    let lineEndIndex = value.indexOf('\n', selectionStart);
    if (lineEndIndex === -1) {
      lineEndIndex = value.length;
    }

    const originalLine = value.substring(lineStartIndex, lineEndIndex);
    
    // Remove existing heading markers and trim leading space
    const textWithoutHashes = originalLine.replace(/^\s*#+\s*/, '');

    const prefix = '#'.repeat(level) + ' ';
    const newLine = prefix + textWithoutHashes;

    const newValue = 
      value.substring(0, lineStartIndex) +
      newLine +
      value.substring(lineEndIndex);
    
    onChange(newValue);

    // Adjust selection to account for added/removed characters
    const lengthDifference = newLine.length - originalLine.length;
    selectionRef.current = { 
      start: selectionStart + lengthDifference, 
      end: selectionEnd + lengthDifference 
    };
  };


  return (
    <div className="flex flex-col bg-slate-800 rounded-lg shadow-lg">
      <div className="p-3 bg-slate-700/50 rounded-t-lg border-b border-slate-600 flex justify-between items-center">
        <h2 className="text-lg font-bold text-sky-300">Editor</h2>
        <div className="flex items-center gap-1">
            <button
                onClick={() => handleHeadingFormatting(1)}
                title="Heading 1"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format line as Heading 1"
            >
                <Heading1 size={18} />
            </button>
            <button
                onClick={() => handleHeadingFormatting(2)}
                title="Heading 2"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format line as Heading 2"
            >
                <Heading2 size={18} />
            </button>
            <button
                onClick={() => handleHeadingFormatting(3)}
                title="Heading 3"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format line as Heading 3"
            >
                <Heading3 size={18} />
            </button>
            <button
                onClick={() => handleHeadingFormatting(4)}
                title="Heading 4"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format line as Heading 4"
            >
                <Heading4 size={18} />
            </button>
            <div className="w-px h-5 bg-slate-600 mx-1"></div>
            <button
                onClick={() => handleMarkdownFormatting('bold')}
                title="Bold"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format selected text as bold"
            >
                <Bold size={18} />
            </button>
             <button
                onClick={() => handleMarkdownFormatting('italic')}
                title="Italic"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format selected text as italic"
            >
                <Italic size={18} />
            </button>
             <button
                onClick={() => handleMarkdownFormatting('underline')}
                title="Underline"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format selected text as underline"
            >
                <Underline size={18} />
            </button>
            <button
                onClick={handleBlockquoteFormatting}
                title="Blockquote"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format selected text as blockquote"
            >
                <Quote size={18} />
            </button>
            <div className="w-px h-5 bg-slate-600 mx-1"></div>
            <button
                onClick={() => handleTextTransform('uppercase')}
                title="Convert selected text to Uppercase"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Convert selected text to Uppercase"
            >
                <CaseUpper size={18} />
            </button>
            <button
                onClick={() => handleTextTransform('lowercase')}
                title="Convert selected text to Lowercase"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Convert selected text to Lowercase"
            >
                <CaseLower size={18} />
            </button>
            <button
                onClick={handleSentenceCase}
                title="Sentence case"
                className="p-2 rounded-md hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                aria-label="Format selected text as Sentence case"
            >
                <ALargeSmall size={18} />
            </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 bg-transparent text-slate-200 resize-none focus:outline-none font-mono text-sm leading-relaxed min-h-[50vh]"
        placeholder="Start writing your speech in Markdown..."
        style={{ overflowY: 'hidden' }}
      />
    </div>
  );
};
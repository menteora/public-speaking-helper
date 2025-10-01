import type { Speech, Point, ContentItem } from '../types';
import { marked } from 'marked';

export const parseMarkdownToSpeech = (markdownText: string): Speech => {
  if (!markdownText.trim()) {
    return { title: null, mainPoints: [] };
  }
  
  const tokens = marked.lexer(markdownText);
  const speech: Speech = {
    title: null,
    mainPoints: [],
  };

  const parentStack: Point[] = [];

  tokens.forEach((token: any) => {
    if (token.type === 'heading') {
      if (token.depth === 1) {
        speech.title = token.text;
        parentStack.length = 0; // Reset stack if a new H1 is found
      } else if (token.depth >= 2 && token.depth <= 6) {
        const newPoint: Point = {
          title: token.text,
          level: token.depth,
          content: [],
          subPoints: [],
        };

        const parentLevelIndex = token.depth - 2; // h2 -> index 0

        if (parentLevelIndex === 0) {
          // This is an H2
          speech.mainPoints.push(newPoint);
        } else {
          // This is an H3, H4, H5, or H6. Find parent.
          const parent = parentStack[parentLevelIndex - 1];
          if (parent) {
            parent.subPoints.push(newPoint);
          }
        }

        // Update the stack
        parentStack[parentLevelIndex] = newPoint;
        parentStack.length = parentLevelIndex + 1; // Truncate stack to current level

      }
    } else if (token.type === 'paragraph' || token.type === 'list' || token.type === 'blockquote') {
      const contentItem: ContentItem = {
        type: token.type,
        html: token.raw,
      };
      
      // Add content to the most recent heading's point.
      if (parentStack.length > 0) {
        const lastPoint = parentStack[parentStack.length - 1];
        lastPoint.content.push(contentItem);
      }
    }
  });

  return speech;
};
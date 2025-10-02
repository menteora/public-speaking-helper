import type { Point } from '../types';

// Helper function to wrap text with <br> for Mermaid
const wrapText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  const words = text.split(' ');
  let currentLine = '';
  const lines: string[] = [];

  words.forEach(word => {
    // If a single word is longer than maxLength, it should be on its own line
    if (word.length > maxLength) {
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        lines.push(word);
        currentLine = '';
        return;
    }

    if ((currentLine + ' ' + word).trim().length > maxLength) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      if (currentLine === '') {
        currentLine = word;
      } else {
        currentLine += ` ${word}`;
      }
    }
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.join('<br>');
};


// Helper to create a unique ID and escape the label text for Mermaid
const createNode = (id: string, text: string, shape: 'rect' | 'round' | 'stadium' = 'rect', wrapLength: number | null = null): string => {
  // Escape characters that might break the Mermaid syntax and strip some markdown
  let processedText = text
    .trim()
    .replace(/&/g, '#amp;')
    .replace(/"/g, '#quot;')
    .replace(/'/g, '#39;')
    .replace(/;/g, '#59;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/_(.*?)_/g, '$1')     // Italic
    .replace(/`([^`]+)`/g, '$1');   // Inline code

  if (wrapLength !== null) {
      processedText = wrapText(processedText, wrapLength);
  }

  let nodeString = `${id}`;
  switch(shape) {
      case 'rect':
        nodeString += `["${processedText}"]`;
        break;
      case 'round':
        nodeString += `("${processedText}")`;
        break;
      case 'stadium':
        nodeString += `(["${processedText}"])`;
        break;
  }
  return nodeString;
};

const processContent = (pointId: string, content: Point['content'], markup: any) => {
    content.forEach((contentItem, contentIndex) => {
        let rawText = contentItem.html;

        if (contentItem.type === 'blockquote') {
            // Strip the leading '>' from each line for cleaner display in the mind map
            rawText = rawText.split('\n').map(line => line.replace(/^\s*>\s?/, '')).join('\n').trim();
        }

        if (contentItem.type === 'list') {
            const listItems = rawText.split('\n').filter(line => line.trim().match(/^(\*|-|\+)\s/));
            listItems.forEach((item, itemIndex) => {
                const cleanItem = item.replace(/^(\*|-|\+)\s/, '').trim();
                if (cleanItem) {
                    const contentId = `${pointId}_c${contentIndex}_${itemIndex}`;
                    markup.nodes.push(`  ${createNode(contentId, cleanItem, 'rect', 30)}`);
                    markup.links.push(`  ${pointId} --> ${contentId}`);
                    markup.styles.push(`  style ${contentId} fill:#1e293b,stroke:#334155,stroke-width:1px,color:#94a3b8,font-size:13px`);
                }
            });
        } else { // paragraph or blockquote
            if (!rawText.trim()) return;

            const contentId = `${pointId}_c${contentIndex}`;
            markup.nodes.push(`  ${createNode(contentId, rawText, 'rect', 35)}`);
            markup.links.push(`  ${pointId} --> ${contentId}`);

            const style = contentItem.type === 'blockquote'
                ? `style ${contentId} fill:#1e293b,stroke:#334155,stroke-width:1px,color:#94a3b8,font-size:13px,font-style:italic`
                : `style ${contentId} fill:#1e293b,stroke:#334155,stroke-width:1px,color:#94a3b8,font-size:13px`;
            markup.styles.push(style);
        }
    });
};

const addPointToGraph = (point: Point, parentId: string, markup: any, idPrefix: string) => {
    const pointId = idPrefix;

    const shapes: { [key: number]: 'round' | 'rect' } = {
        3: 'round',
        4: 'rect',
        5: 'rect',
        6: 'rect',
    };
    const shape = shapes[point.level] || 'rect';

    const wrapLengths: { [key: number]: number } = {
        3: 35,
        4: 30,
        5: 30,
        6: 30,
    };
    const wrapLength = wrapLengths[point.level] || 30;

    markup.nodes.push(`  ${createNode(pointId, point.title, shape, wrapLength)}`);
    markup.links.push(`  ${parentId} --> ${pointId}`);

    const styles: { [key: number]: string } = {
        3: `style ${pointId} fill:#334155,stroke:#475569,stroke-width:2px,color:#e2e8f0,font-size:16px,font-weight:bold`, // H3
        4: `style ${pointId} fill:#1e293b,stroke:#334155,stroke-width:1px,color:#94a3b8,font-size:14px`, // H4+
    };
    markup.styles.push(styles[point.level] || styles[4]);
    
    processContent(pointId, point.content, markup);

    point.subPoints.forEach((subPoint, index) => {
        addPointToGraph(subPoint, pointId, markup, `${pointId}_${index}`);
    });
};

export const generateMindMapMarkup = (mainPoint: Point | null, direction: 'LR' | 'TD' = 'LR'): string => {
  if (!mainPoint) {
    return `
graph ${direction}
  A["No content"] --> B["Select a section to view the structure"]
    `;
  }

  let markupString = `graph ${direction}\n`;
  const markup = { nodes: [] as string[], links: [] as string[], styles: [] as string[] };
  
  const rootId = 'root';
  markup.nodes.push(`  ${createNode(rootId, mainPoint.title, 'stadium', 40)}`);
  markup.styles.push(`  style ${rootId} fill:#0284c7,stroke:#333,stroke-width:2px,color:#fff,font-size:18px,font-weight:bold`);
  
  if (mainPoint.subPoints.length === 0 && mainPoint.content.length === 0) {
      const emptyNodeId = 'empty';
      markup.nodes.push(`  ${createNode(emptyNodeId, '(No sub-points or content for this section)', 'round')}`);
      markup.links.push(`  ${rootId} --> ${emptyNodeId}`);
      markup.styles.push(`  style ${emptyNodeId} fill:#334155,stroke:#475569,stroke-width:2px,color:#e2e8f0,font-size:14px,font-style:italic`);
  } else {
    processContent(rootId, mainPoint.content, markup);
    mainPoint.subPoints.forEach((subPoint, index) => {
      addPointToGraph(subPoint, rootId, markup, `sp${index}`);
    });
  }

  return `${markupString}\n${markup.nodes.join('\n')}\n\n${markup.links.join('\n')}\n\n${markup.styles.join('\n')}`;
};
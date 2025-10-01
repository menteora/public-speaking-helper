
export type ContentItem = {
  type: 'paragraph' | 'list' | 'blockquote';
  html: string;
};

export type Point = {
  title: string;
  level: number;
  content: ContentItem[];
  subPoints: Point[];
  timestamp?: number; // Time in seconds when this point was first reached in the current session
  previousTimestamp?: number; // Time in seconds from the previous session
};

export type Speech = {
  title: string | null;
  mainPoints: Point[];
};

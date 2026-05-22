import { collectMarkdownHeadings } from './markdownHeadings';

export interface OutlineItem {
  id: string;
  title: string;
  depth: number;
  titleStart: number;
  titleEnd: number;
  selectionStart: number;
  selectionEnd: number;
}

export function parseMarkdownOutline(source: string): OutlineItem[] {
  return collectMarkdownHeadings(source).map((heading, index) => ({
    id: `${index}-${heading.selectionStart}`,
    ...heading,
  }));
}

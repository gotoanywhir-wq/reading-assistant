import * as pdfjsLib from 'pdfjs-dist';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, PageBreak,
} from 'docx';

interface TextItem {
  str: string;
  fontName: string;
  fontSize: number;
  x: number;
  y: number;
  width: number;
  hasEOL: boolean;
  isBold: boolean;
  isItalic: boolean;
}

function isBoldFont(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('bold') || n.includes('black') || n.includes('heavy');
}

function isItalicFont(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('italic') || n.includes('oblique');
}

function parseItems(raw: any[]): TextItem[] {
  return raw
    .filter((item) => item.str !== undefined && (item.str.trim() !== '' || item.hasEOL))
    .map((item) => ({
      str: item.str,
      fontName: item.fontName || '',
      fontSize: Math.abs(item.transform[0]) || item.height || 10,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
      hasEOL: !!item.hasEOL,
      isBold: isBoldFont(item.fontName || ''),
      isItalic: isItalicFont(item.fontName || ''),
    }));
}

interface Line {
  y: number;
  fontSize: number;
  items: TextItem[];
}

function groupIntoLines(items: TextItem[]): Line[] {
  if (items.length === 0) return [];
  const lines: Line[] = [];
  let currentLine: Line | null = null;

  for (const item of items) {
    const sameLine =
      currentLine &&
      Math.abs(currentLine.y - item.y) < Math.max(currentLine.fontSize, item.fontSize) * 0.4;

    if (sameLine && currentLine) {
      currentLine.items.push(item);
      if (item.fontSize > currentLine.fontSize) currentLine.fontSize = item.fontSize;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = { y: item.y, fontSize: item.fontSize, items: [item] };
    }
  }
  if (currentLine) lines.push(currentLine);
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines;
}

interface ParagraphData {
  text: string;
  runs: { text: string; bold: boolean; italic: boolean }[];
  fontSize: number;
  isHeading: boolean;
  indent: number;
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] | undefined;
}

function classifyLines(lines: Line[]): ParagraphData[] {
  if (lines.length === 0) return [];

  // Determine body text font size (most common)
  const sizeFreq: Map<number, number> = new Map();
  for (const line of lines) {
    if (line.items.length > 0 && line.items[0].str.trim()) {
      sizeFreq.set(line.fontSize, (sizeFreq.get(line.fontSize) || 0) + 1);
    }
  }
  let bodySize = 12;
  let maxFreq = 0;
  for (const [size, freq] of sizeFreq) {
    if (freq > maxFreq) { maxFreq = freq; bodySize = size; }
  }

  // Left margin (most common x for body text)
  const indentFreq: Map<number, number> = new Map();
  for (const line of lines) {
    if (line.items.length > 0 && Math.abs(line.fontSize - bodySize) < 1) {
      const x = Math.round(line.items[0].x);
      indentFreq.set(x, (indentFreq.get(x) || 0) + 1);
    }
  }
  let leftMargin = 0;
  maxFreq = 0;
  for (const [x, freq] of indentFreq) {
    if (freq > maxFreq) { maxFreq = freq; leftMargin = x; }
  }

  const paragraphs: ParagraphData[] = [];
  let prevLine: Line | null = null;

  for (const line of lines) {
    const runs: ParagraphData['runs'] = [];
    let prevItem: TextItem | null = null;

    for (const item of line.items) {
      if (!item.str.trim() && !item.hasEOL) continue;

      // Insert space gap between items that aren't adjacent
      if (prevItem && item.str.trim()) {
        const gap = item.x - (prevItem.x + prevItem.width);
        if (gap > prevItem.fontSize * 0.3) {
          runs.push({ text: ' ', bold: false, italic: false });
        }
      }

      if (item.str.trim()) {
        runs.push({ text: item.str, bold: item.isBold, italic: item.isItalic });
      }
      prevItem = item;
    }

    if (runs.length === 0) continue;
    const text = runs.map(r => r.text).join('');
    if (!text.trim()) continue;

    const lineFontSize = line.fontSize;
    const isHeading = lineFontSize > bodySize + 2;
    const indent = Math.max(0, Math.round(line.items[0].x) - leftMargin);

    // Detect center alignment: if text is roughly centered
    let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] | undefined;
    const pageWidth = 595; // A4 width in points
    const textWidth = line.items.reduce((sum, i) => sum + i.width, 0);
    const textStart = line.items[0].x;
    const textEnd = textStart + textWidth;
    const leftSpace = textStart;
    const rightSpace = pageWidth - textEnd;
    if (Math.abs(leftSpace - rightSpace) < 30 && textWidth < pageWidth * 0.8) {
      alignment = AlignmentType.CENTER;
    }

    // Merge with previous paragraph if same line
    const prevGap = prevLine ? Math.abs(prevLine.y - line.y) : 999;
    const isSameParagraph =
      prevLine &&
      prevGap < bodySize * 1.6 &&
      Math.abs(lineFontSize - prevLine.fontSize) < 1 &&
      indent > 0 &&
      Math.abs(indent - (Math.round(prevLine.items[0]?.x || 0) - leftMargin)) < 5;

    if (isSameParagraph && paragraphs.length > 0) {
      const last = paragraphs[paragraphs.length - 1];
      last.runs.push({ text: ' ', bold: false, italic: false }, ...runs);
      last.text = last.runs.map(r => r.text).join('');
    } else {
      paragraphs.push({ text, runs, fontSize: lineFontSize, isHeading, indent, alignment });
    }

    prevLine = line;
  }

  return paragraphs;
}

function paragraphToDocx(p: ParagraphData, isLast: boolean): Paragraph {
  const docxRuns = p.runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.bold || p.isHeading,
        italics: r.italic,
        size: Math.round(p.fontSize * 2),
        font: 'Times New Roman',
      })
  );

  let heading: typeof HeadingLevel[keyof typeof HeadingLevel] | undefined;
  if (p.isHeading) {
    if (p.fontSize > 20) heading = HeadingLevel.HEADING_1;
    else if (p.fontSize > 16) heading = HeadingLevel.HEADING_2;
    else heading = HeadingLevel.HEADING_3;
  }

  const indentPts = p.indent > 10 ? Math.round(p.indent * 20) : undefined;

  return new Paragraph({
    children: docxRuns,
    heading,
    alignment: p.alignment,
    spacing: { after: p.isHeading ? 240 : 120, before: p.isHeading ? 360 : 0 },
    indent: indentPts ? { left: indentPts } : undefined,
    ...(isLast ? {} : {}),
  });
}

export async function convertPdfToDocx(pdfBlob: Blob): Promise<Blob> {
  let pdf;
  try {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (e) {
    throw new Error('PDF加载失败: ' + (e instanceof Error ? e.message : String(e)));
  }

  const sections: any[] = [];
  let hasAnyText = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = parseItems(textContent.items);
    const lines = groupIntoLines(items);
    const paragraphs = classifyLines(lines);

    if (paragraphs.length > 0) hasAnyText = true;

    const children: Paragraph[] = [];

    // Page break before every page except the first
    if (i > 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    for (let j = 0; j < paragraphs.length; j++) {
      children.push(paragraphToDocx(paragraphs[j], j === paragraphs.length - 1));
    }

    if (children.length > 0) {
      sections.push({ children });
    }
  }

  if (!hasAnyText) {
    throw new Error('无法提取PDF文本。该PDF可能是扫描件或纯图片格式，请尝试使用OCR工具处理后再转换。');
  }

  try {
    const doc = new Document({ sections });
    return await Packer.toBlob(doc);
  } catch (e) {
    throw new Error('Word文档生成失败: ' + (e instanceof Error ? e.message : String(e)));
  }
}

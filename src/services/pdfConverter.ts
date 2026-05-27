import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

function extractOrderedText(items: any[]): string[] {
  const filtered = items
    .filter((item) => item.str && item.str.trim())
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      height: Math.abs(item.transform[0]) || item.height || 10,
    }));
  if (filtered.length === 0) return [];
  const lines: { y: number; items: typeof filtered }[] = [];
  for (const item of filtered) {
    const existing = lines.find((l) => Math.abs(l.y - item.y) < 3);
    if (existing) existing.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  lines.sort((a, b) => b.y - a.y);
  for (const line of lines) line.items.sort((a, b) => a.x - b.x);
  return lines
    .map((line) => {
      let text = '';
      let prevEnd = -Infinity;
      for (const item of line.items) {
        if (prevEnd > -Infinity && item.x - prevEnd > item.height * 0.3) text += ' ';
        text += item.str;
        prevEnd = item.x + item.str.length * item.height * 0.5;
      }
      return text.trim();
    })
    .filter(Boolean);
}

export async function convertPdfToDocx(pdfBlob: Blob): Promise<Blob> {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const children: Paragraph[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const lines = extractOrderedText(textContent.items);

    // Page heading
    children.push(
      new Paragraph({
        text: `Page ${i}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    // Text lines
    for (const line of lines) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22, font: 'Times New Roman' })],
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

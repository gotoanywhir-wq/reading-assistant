import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } from 'docx';
import type { Note, VocabWord } from '../types';

export async function exportNotesToWord(notes: Note[], fileName: string): Promise<void> {
  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      text: `${fileName} - 读书笔记`,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  for (const note of notes) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '原文引用', bold: true, color: '666666' }),
        ],
        spacing: { before: 300 },
      })
    );
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: note.quoteText, italics: true })],
        spacing: { after: 100 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 10 },
        },
        indent: { left: 400 },
      })
    );

    if (note.translation) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: '翻译', bold: true, color: '666666' })],
        })
      );
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: note.translation })],
          spacing: { after: 100 },
          indent: { left: 400 },
        })
      );
    }

    if (note.userNote) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: '我的笔记', bold: true, color: '666666' })],
        })
      );
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: note.userNote })],
          spacing: { after: 200 },
          indent: { left: 400 },
        })
      );
    }

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: new Date(note.createdAt).toLocaleString('zh-CN'),
            size: 18,
            color: '999999',
          }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_读书笔记.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportVocabToWord(words: VocabWord[]): Promise<void> {
  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({
      text: '英文词汇积累本',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    })
  );

  for (const w of words) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: w.word, bold: true, size: 28 }),
          new TextRun({ text: `  ${w.meaning}`, size: 24 }),
        ],
        spacing: { before: 200 },
      })
    );

    if (w.exampleSentence) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '例句：', bold: true, color: '666666', size: 20 }),
            new TextRun({ text: w.exampleSentence, italics: true, size: 20 }),
          ],
          indent: { left: 400 },
        })
      );
    }

    if (w.comment) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '备注：', bold: true, color: '666666', size: 20 }),
            new TextRun({ text: w.comment, size: 20 }),
          ],
          indent: { left: 400 },
        })
      );
    }

    if (w.sourceFileName) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: `来源：${w.sourceFileName}`, size: 18, color: '999999' }),
          ],
          indent: { left: 400 },
          spacing: { after: 100 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '英文词汇积累本.docx';
  a.click();
  URL.revokeObjectURL(url);
}

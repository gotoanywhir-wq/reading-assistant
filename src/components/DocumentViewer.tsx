import { useEffect, useRef, useState, useCallback } from 'react';
import type { FileRecord, Note } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { MagnifyingGlassPlus, MagnifyingGlassMinus } from '@phosphor-icons/react';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface NoteLocation {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
}

interface DocumentViewerProps {
  file: FileRecord;
  onAddNote: (quoteText: string, translation?: string, location?: NoteLocation) => void;
  onAddVocab: (word: string, exampleSentence: string) => void;
  onTranslate: (text: string) => Promise<string>;
  onTriggerTranslate: (trigger: { text: string } | null) => void;
  notes: Note[];
  highlightTarget: Note | null;
}

interface SelectionMenu {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  location?: NoteLocation;
}

interface PageTranslation {
  [page: number]: string;
}

function extractOrderedText(items: any[]): string {
  const filtered = items
    .filter((item) => item.str && item.str.trim())
    .map((item) => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      height: Math.abs(item.transform[0]) || item.height || 10,
    }));
  if (filtered.length === 0) return '';
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
      return text;
    })
    .join('\n');
}

function getSelectionLocation(selection: Selection, container: HTMLElement): NoteLocation | undefined {
  if (!selection.rangeCount) return undefined;
  const range = selection.getRangeAt(0);

  // Find which page div the selection is in
  let node = range.startContainer;
  let pageDiv: HTMLElement | null = null;
  while (node && node !== container) {
    if ((node as HTMLElement).getAttribute?.('data-page-num')) {
      pageDiv = node as HTMLElement;
      break;
    }
    node = node.parentNode!;
  }
  if (!pageDiv) return undefined;

  const pageNumber = Number(pageDiv.getAttribute('data-page-num'));
  const textLayer = pageDiv.querySelector('.textLayer');
  if (!textLayer) return undefined;

  // Collect all spans in DOM order with cumulative offset
  const spans = Array.from(textLayer.querySelectorAll('span'));
  let offset = 0;
  let startOffset = -1;
  let endOffset = -1;

  for (const span of spans) {
    const textNode = span.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      offset += (span.textContent?.length || 0);
      continue;
    }

    if (startOffset === -1 && textLayer.contains(range.startContainer)) {
      if (textNode === range.startContainer || span.contains(range.startContainer)) {
        const nodeOffset = range.startContainer === textNode ? range.startOffset : 0;
        startOffset = offset + nodeOffset;
      }
    }

    if (textLayer.contains(range.endContainer)) {
      if (textNode === range.endContainer || span.contains(range.endContainer)) {
        const nodeOffset = range.endContainer === textNode ? range.endOffset : textNode.textContent?.length || 0;
        endOffset = offset + nodeOffset;
      }
    }

    offset += (textNode.textContent?.length || 0);
  }

  if (startOffset === -1 || endOffset === -1) return undefined;
  return { pageNumber, startOffset: Math.min(startOffset, endOffset), endOffset: Math.max(startOffset, endOffset) };
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

export default function DocumentViewer({ file, onAddNote, onAddVocab, onTranslate, onTriggerTranslate, notes, highlightTarget }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfTextsRef = useRef<{ [p: number]: string }>({});
  const scrollPosKey = `scroll-${file.id}`;

  const [menu, setMenu] = useState<SelectionMenu>({ visible: false, x: 0, y: 0, text: '' });
  const [translatingPage, setTranslatingPage] = useState<number | null>(null);
  const [pageTranslations, setPageTranslations] = useState<PageTranslation>({});
  const [numPages, setNumPages] = useState(0);
  const [wordContent, setWordContent] = useState('');
  const [translatingAll, setTranslatingAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const baseScaleRef = useRef(1);
  const flashTimeoutRef = useRef<number | null>(null);

  // Save scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saveScroll = () => sessionStorage.setItem(scrollPosKey, String(el.scrollTop));
    el.addEventListener('scroll', saveScroll, { passive: true });
    return () => el.removeEventListener('scroll', saveScroll);
  }, [scrollPosKey]);

  // Restore scroll position
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const saved = sessionStorage.getItem(scrollPosKey);
      if (saved) el.scrollTop = Number(saved);
    }, 300);
    return () => clearTimeout(timer);
  }, [scrollPosKey, wordContent, currentPage]);

  useEffect(() => {
    setMenu({ visible: false, x: 0, y: 0, text: '' });
    setPageTranslations({});
    pdfTextsRef.current = {};
    setNumPages(0);
    setCurrentPage(0);
    setWordContent('');
    setZoom(1.0);
  }, [file.id]);

  // Render highlight marks on PDF
  useEffect(() => {
    const container = containerRef.current;
    if (!container || file.type !== 'pdf') return;

    // Clear previous highlights
    container.querySelectorAll('.note-highlight').forEach((el) => {
      (el as HTMLElement).style.backgroundColor = '';
      el.classList.remove('note-highlight', 'note-highlight-flash');
    });

    for (const note of notes) {
      if (!note.location) continue;
      const pageDiv = container.querySelector(`[data-page-num="${note.location.pageNumber}"]`);
      if (!pageDiv) continue;
      const textLayer = pageDiv.querySelector('.textLayer');
      if (!textLayer) continue;

      const spans = Array.from(textLayer.querySelectorAll('span'));
      let offset = 0;
      for (const span of spans) {
        const textLen = span.textContent?.length || 0;
        const spanStart = offset;
        const spanEnd = offset + textLen;

        if (spanEnd > note.location.startOffset && spanStart < note.location.endOffset) {
          span.classList.add('note-highlight');
          (span as HTMLElement).style.backgroundColor = 'rgba(20, 184, 166, 0.15)';
        }
        offset += textLen;
      }
    }
  }, [notes, file.type, numPages, zoom]);

  // Handle highlightTarget: scroll to position + flash
  useEffect(() => {
    if (!highlightTarget?.location) return;
    const container = containerRef.current;
    if (!container) return;

    const pageDiv = container.querySelector(`[data-page-num="${highlightTarget.location.pageNumber}"]`);
    if (pageDiv) {
      pageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Flash highlight
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);

    const textLayer = pageDiv?.querySelector('.textLayer');
    if (!textLayer) return;

    const spans = Array.from(textLayer.querySelectorAll('span.note-highlight'));
    let offset = 0;
    for (const span of spans) {
      const textLen = span.textContent?.length || 0;
      const spanStart = offset;
      const spanEnd = offset + textLen;

      if (spanEnd > highlightTarget.location.startOffset && spanStart < highlightTarget.location.endOffset) {
        (span as HTMLElement).style.backgroundColor = 'rgba(20, 184, 166, 0.5)';
        span.classList.add('note-highlight-flash');
      }
      offset += textLen;
    }

    flashTimeoutRef.current = window.setTimeout(() => {
      textLayer.querySelectorAll('.note-highlight-flash').forEach((el) => {
        (el as HTMLElement).style.backgroundColor = 'rgba(20, 184, 166, 0.15)';
        el.classList.remove('note-highlight-flash');
      });
    }, 2000);
  }, [highlightTarget]);

  // Render PDF
  useEffect(() => {
    if (file.type !== 'pdf' || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';
    let cancelled = false;

    (async () => {
      const arrayBuffer = await file.blob.arrayBuffer();
      if (cancelled) return;
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        standardFontDataUrl: new URL('standard_fonts/', document.baseURI).href,
      }).promise;
      if (cancelled) return;
      setNumPages(pdf.numPages);

      // Calculate base scale to fit container width
      const firstPage = await pdf.getPage(1);
      const baseViewport = firstPage.getViewport({ scale: 1 });
      const scrollEl = container.closest('.overflow-y-auto') as HTMLElement;
      const availableWidth = scrollEl
        ? scrollEl.clientWidth - 48
        : window.innerWidth - 48;
      const baseScale = Math.min(availableWidth / baseViewport.width, 2.0);
      baseScaleRef.current = baseScale;

      const pdfScale = baseScale * zoom;
      const outputScale = window.devicePixelRatio || 1;

      const texts: { [p: number]: string } = {};

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: pdfScale });

        const pageDiv = document.createElement('div');
        pageDiv.setAttribute('data-page-num', String(i));
        pageDiv.style.cssText = `
          margin: 0 auto 24px auto; background: white;
          border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden;
          width: ${viewport.width}px;
        `;

        const innerBox = document.createElement('div');
        innerBox.style.cssText = `
          position: relative;
          width: ${viewport.width}px; height: ${viewport.height}px;
        `;
        pageDiv.appendChild(innerBox);

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.cssText = `display: block; width: ${viewport.width}px; height: ${viewport.height}px;`;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(outputScale, outputScale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        await (page.render as any)({ canvasContext: ctx, viewport }).promise;
        innerBox.appendChild(canvas);

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.setAttribute('translate', 'no');
        textLayerDiv.style.setProperty('--total-scale-factor', `${pdfScale}`);
        const textContent = await page.getTextContent();
        texts[i] = extractOrderedText(textContent.items);
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();
        innerBox.appendChild(textLayerDiv);

        // Button bar
        const btnBar = document.createElement('div');
        btnBar.style.cssText = 'height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px;';
        const btn = document.createElement('button');
        btn.className = 'translate-page-btn';
        btn.setAttribute('data-page', String(i));
        btn.style.cssText = `padding: 3px 10px; font-size: 11px; cursor: pointer; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; border-radius: 4px; transition: background 0.15s;`;
        btn.textContent = '翻译本页';
        btn.onmouseenter = () => { btn.style.background = '#dbeafe'; };
        btn.onmouseleave = () => { btn.style.background = '#eff6ff'; };
        btn.onclick = () => {
          const pn = i;
          const t = pdfTextsRef.current[pn];
          if (!t || !t.trim()) { alert('该页没有可翻译的文本'); return; }
          setTranslatingPage(pn);
          onTranslate(t)
            .then((tr) => setPageTranslations((pt) => ({ ...pt, [pn]: tr })))
            .catch((e) => alert('翻译失败: ' + (e instanceof Error ? e.message : '未知错误')))
            .finally(() => setTranslatingPage(null));
        };
        btnBar.appendChild(btn);
        pageDiv.appendChild(btnBar);

        const transBlock = document.createElement('div');
        transBlock.className = 'page-translation-block';
        transBlock.setAttribute('data-page', String(i));
        transBlock.style.display = 'none';
        pageDiv.appendChild(transBlock);

        container.appendChild(pageDiv);
        pdfTextsRef.current = { ...texts };
        setCurrentPage(i);
      }
    })();

    return () => { cancelled = true; };
  }, [file, onTranslate, zoom]);

  // Render Word
  useEffect(() => {
    if (file.type !== 'word') return;
    let cancelled = false;
    (async () => {
      const ab = await file.blob.arrayBuffer();
      const result = await (await import('mammoth')).convertToHtml({ arrayBuffer: ab });
      if (!cancelled) setWordContent(result.value);
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Sync translation blocks
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    for (let i = 1; i <= numPages; i++) {
      const block = container.querySelector(`.page-translation-block[data-page="${i}"]`) as HTMLElement;
      if (!block) continue;
      const t = pageTranslations[i];
      if (t) {
        block.style.cssText = `display: block; margin: 0 10px 10px 10px; padding: 12px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; font-size: 13px; line-height: 1.7; color: #374151;`;
        block.innerHTML = `<div style="font-size:10px;color:#60a5fa;font-weight:600;margin-bottom:4px;">页面翻译</div>${t}`;
      } else {
        block.style.display = 'none';
      }
    }
  }, [pageTranslations, numPages]);

  // Sync button states
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    container.querySelectorAll('.translate-page-btn').forEach((btn) => {
      const el = btn as HTMLElement;
      const pn = Number(el.getAttribute('data-page'));
      if (pn === translatingPage) {
        el.textContent = '翻译中...';
        el.style.cssText += 'pointer-events:none; color:#f59e0b; border-color:#fde68a; background:#fffbeb;';
      } else if (pageTranslations[pn]) {
        el.textContent = '已翻译 ✓';
        el.style.cssText += 'cursor:default; color:#22c55e; border-color:#bbf7d0; background:#f0fdf4;';
      } else {
        el.textContent = '翻译本页';
      }
    });
  }, [translatingPage, pageTranslations, numPages]);

  const handleTranslateAll = useCallback(async () => {
    if (Object.keys(pdfTextsRef.current).length === 0) return;
    setTranslatingAll(true);
    for (let i = 1; i <= numPages; i++) {
      if (pageTranslations[i]) continue;
      const text = pdfTextsRef.current[i];
      if (!text || !text.trim()) continue;
      setTranslatingPage(i);
      try {
        const t = await onTranslate(text);
        setPageTranslations((pt) => ({ ...pt, [i]: t }));
      } catch (err) {
        alert(`第 ${i} 页翻译失败: ` + (err instanceof Error ? err.message : '未知错误'));
        break;
      }
    }
    setTranslatingPage(null);
    setTranslatingAll(false);
  }, [numPages, pageTranslations, onTranslate]);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      if (menu.visible) setMenu({ visible: false, x: 0, y: 0, text: '' });
      return;
    }
    const text = selection.toString().trim();
    if (!text) return;
    if (scrollRef.current && !scrollRef.current.contains(selection.anchorNode)) return;

    const location = getSelectionLocation(selection, scrollRef.current!);
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setMenu({ visible: true, x: rect.left + rect.width / 2, y: rect.top - 10, text, location });
  }, [menu.visible]);

  const handleQuoteToNote = () => {
    onAddNote(menu.text, undefined, menu.location);
    setMenu({ visible: false, x: 0, y: 0, text: '' });
    window.getSelection()?.removeAllRanges();
  };

  const handleAddToVocab = () => {
    onAddVocab(menu.text, '');
    setMenu({ visible: false, x: 0, y: 0, text: '' });
    window.getSelection()?.removeAllRanges();
  };

  const zoomIn = () => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  const zoomOut = () => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN));

  return (
    <div className="flex-1 overflow-y-auto relative bg-gray-50" ref={scrollRef} onMouseUp={handleMouseUp}>
      {/* Toolbar */}
      {file.type === 'pdf' && numPages > 0 && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-1.5 flex items-center gap-3 shadow-sm">
          <span className="text-xs text-gray-500">
            {numPages} 页 {currentPage < numPages ? `(渲染 ${currentPage}...)` : ''}
          </span>
          <button
            onClick={handleTranslateAll}
            disabled={translatingAll}
            className="px-2.5 py-1 text-[10px] bg-amber-500 hover:bg-amber-400 text-white rounded transition-colors disabled:opacity-50"
          >
            {translatingAll ? `翻译第 ${translatingPage} 页...` : '翻译全文'}
          </button>
          {Object.keys(pageTranslations).length > 0 && (
            <button
              onClick={() => setPageTranslations({})}
              className="px-2.5 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-500 rounded transition-colors"
            >
              隐藏翻译
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} className="p-1 text-gray-500 hover:text-teal-600 disabled:text-gray-300 disabled:cursor-default transition-colors active:scale-[0.93]" title="缩小">
              <MagnifyingGlassMinus size={16} weight="bold" />
            </button>
            <span className="text-[11px] text-gray-500 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} className="p-1 text-gray-500 hover:text-teal-600 disabled:text-gray-300 disabled:cursor-default transition-colors active:scale-[0.93]" title="放大">
              <MagnifyingGlassPlus size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Word toolbar */}
      {file.type === 'word' && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-1.5 flex items-center justify-between shadow-sm">
          <span className="text-xs text-gray-500">{file.name}</span>
          <div className="flex items-center gap-1">
            <button onClick={zoomOut} disabled={zoom <= ZOOM_MIN} className="p-1 text-gray-500 hover:text-teal-600 disabled:text-gray-300 disabled:cursor-default transition-colors active:scale-[0.93]" title="缩小">
              <MagnifyingGlassMinus size={16} weight="bold" />
            </button>
            <span className="text-[11px] text-gray-500 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} disabled={zoom >= ZOOM_MAX} className="p-1 text-gray-500 hover:text-teal-600 disabled:text-gray-300 disabled:cursor-default transition-colors active:scale-[0.93]" title="放大">
              <MagnifyingGlassPlus size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Word content */}
      {file.type === 'word' && wordContent && (
        <div className="p-6" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          <div
            className="prose max-w-none prose-p:text-gray-700 dark:prose-p:text-zinc-300 prose-h1:text-gray-900 dark:prose-h1:text-zinc-200 prose-h2:text-gray-900 dark:prose-h2:text-zinc-200 prose-h3:text-gray-800 dark:prose-h3:text-zinc-300 prose-strong:text-gray-800 dark:prose-strong:text-zinc-200 prose-em:text-gray-600 dark:prose-em:text-zinc-400 prose-li:text-gray-700 dark:prose-li:text-zinc-300 prose-a:text-blue-600 dark:prose-a:text-zinc-300"
            dangerouslySetInnerHTML={{ __html: wordContent }}
          />
        </div>
      )}

      {/* PDF */}
      <div
        ref={containerRef}
        className="p-6 min-h-full text-center"
        style={{ display: file.type === 'pdf' ? 'block' : 'none' }}
        translate="no"
      />

      {/* Selection menu */}
      {menu.visible && (
        <div
          className="fixed z-50 flex gap-1 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5"
          style={{ left: menu.x, top: menu.y, transform: 'translate(-50%, -100%)' }}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <button onClick={handleQuoteToNote} onMouseDown={(e) => e.preventDefault()} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">
            摘录到笔记
          </button>
          <button onClick={handleAddToVocab} onMouseDown={(e) => e.preventDefault()} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors">
            加入单词本
          </button>
          <button
            onClick={() => {
              onTriggerTranslate({ text: menu.text });
              setMenu({ visible: false, x: 0, y: 0, text: '' });
              window.getSelection()?.removeAllRanges();
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-white rounded transition-colors"
          >
            翻译
          </button>
        </div>
      )}
    </div>
  );
}

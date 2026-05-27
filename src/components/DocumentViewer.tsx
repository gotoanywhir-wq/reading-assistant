import { useEffect, useRef, useState, useCallback } from 'react';
import type { FileRecord, VocabWord } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface DocumentViewerProps {
  file: FileRecord;
  onAddNote: (quoteText: string, translation?: string) => void;
  onAddVocab: (word: string, exampleSentence: string) => void;
  onTranslate: (text: string) => Promise<string>;
  vocabWords: VocabWord[];
  onTriggerTranslate: (trigger: { text: string } | null) => void;
}

interface SelectionMenu {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}

interface PageTranslation {
  [page: number]: string;
}

const PDF_SCALE = 1.5;

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

export default function DocumentViewer({ file, onAddNote, onAddVocab, onTranslate, vocabWords, onTriggerTranslate }: DocumentViewerProps) {
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

  const [showMiniVocab, setShowMiniVocab] = useState(false);

  // Save scroll position on unmount / tab switch
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const saveScroll = () => {
      sessionStorage.setItem(scrollPosKey, String(el.scrollTop));
    };
    el.addEventListener('scroll', saveScroll, { passive: true });
    return () => el.removeEventListener('scroll', saveScroll);
  }, [scrollPosKey]);

  // Restore scroll position after content loads
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const saved = sessionStorage.getItem(scrollPosKey);
      if (saved) {
        el.scrollTop = Number(saved);
      }
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
  }, [file.id]);

  // Render PDF
  useEffect(() => {
    if (file.type !== 'pdf' || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';
    let cancelled = false;

    (async () => {
      const arrayBuffer = await file.blob.arrayBuffer();
      if (cancelled) return;
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      if (cancelled) return;
      setNumPages(pdf.numPages);

      const texts: { [p: number]: string } = {};

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: PDF_SCALE });

        const pageDiv = document.createElement('div');
        pageDiv.setAttribute('data-page-num', String(i));
        pageDiv.style.cssText = `
          margin: 0 auto 24px auto; background: white;
          border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          overflow: hidden; max-width: 100%;
        `;

        const innerBox = document.createElement('div');
        innerBox.style.cssText = `
          position: relative;
          width: ${viewport.width}px; height: ${viewport.height}px;
          transform-origin: top left;
        `;
        pageDiv.appendChild(innerBox);

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = 'display: block;';
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        innerBox.appendChild(canvas);

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.cssText = `
          position: absolute; left: 0; top: 0;
          width: ${viewport.width}px; height: ${viewport.height}px;
          overflow: hidden; line-height: 1;
        `;
        const textContent = await page.getTextContent();
        texts[i] = extractOrderedText(textContent.items);
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
        });
        await textLayer.render();
        innerBox.appendChild(textLayerDiv);

        const scrollContainer = container.closest('.overflow-y-auto') as HTMLElement;
        const availableWidth = scrollContainer
          ? scrollContainer.clientWidth - 48
          : window.innerWidth - 48;
        const scaleFactor = Math.min(1, availableWidth / viewport.width);
        if (scaleFactor < 1) {
          innerBox.style.transform = `scale(${scaleFactor})`;
          pageDiv.style.height = `${viewport.height * scaleFactor}px`;
          pageDiv.style.width = `${viewport.width * scaleFactor}px`;
        } else {
          pageDiv.style.width = `${viewport.width}px`;
        }

        // Button bar
        const btnBar = document.createElement('div');
        btnBar.style.cssText = 'height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px;';
        const btn = document.createElement('button');
        btn.className = 'translate-page-btn';
        btn.setAttribute('data-page', String(i));
        btn.style.cssText = `padding: 4px 12px; font-size: 12px; cursor: pointer; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; border-radius: 4px; transition: background 0.15s;`;
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
  }, [file, onTranslate]);

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
        block.style.cssText = `display: block; margin: 0 12px 12px 12px; padding: 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; font-size: 14px; line-height: 1.7; color: #374151;`;
        block.innerHTML = `<div style="font-size:11px;color:#60a5fa;font-weight:600;margin-bottom:6px;">页面翻译</div>${t}`;
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
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setMenu({ visible: true, x: rect.left + rect.width / 2, y: rect.top - 10, text });
  }, [menu.visible]);

  const handleQuoteToNote = () => {
    onAddNote(menu.text);
    setMenu({ visible: false, x: 0, y: 0, text: '' });
    window.getSelection()?.removeAllRanges();
  };

  const handleAddToVocab = () => {
    onAddVocab(menu.text, '');
    setMenu({ visible: false, x: 0, y: 0, text: '' });
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="flex-1 overflow-y-auto relative bg-gray-50" ref={scrollRef} onMouseUp={handleMouseUp}>
      {/* Toolbar */}
      {file.type === 'pdf' && numPages > 0 && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shadow-sm">
          <span className="text-sm text-gray-600">
            共 {numPages} 页 {currentPage < numPages ? `(已渲染 ${currentPage} 页...)` : ''}
          </span>
          <button
            onClick={handleTranslateAll}
            disabled={translatingAll}
            className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-white rounded transition-colors disabled:opacity-50"
          >
            {translatingAll ? `正在翻译第 ${translatingPage} 页...` : '翻译全文'}
          </button>
          {Object.keys(pageTranslations).length > 0 && (
            <button
              onClick={() => setPageTranslations({})}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-500 rounded transition-colors"
            >
              隐藏翻译
            </button>
          )}
          {/* Mini vocab toggle removed — now in FileList */}
        </div>
      )}

      {/* Word toolbar */}
      {file.type === 'word' && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shadow-sm">
          <span className="text-sm text-gray-600">{file.name}</span>
        </div>
      )}

      {/* Main content */}
      {/* Word */}
      {file.type === 'word' && wordContent && (
        <div className="p-6">
          <div
            className="prose max-w-none prose-p:text-gray-700 prose-h1:text-gray-900 prose-h2:text-gray-900 prose-h3:text-gray-800 prose-strong:text-gray-800 prose-em:text-gray-600 prose-li:text-gray-700 prose-a:text-blue-600"
            dangerouslySetInnerHTML={{ __html: wordContent }}
          />
        </div>
      )}

      {/* PDF */}
      <div
        ref={containerRef}
        className="p-6 min-h-full text-center"
        style={{ display: file.type === 'pdf' ? 'block' : 'none' }}
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

import { useState, useRef, useEffect } from 'react';
import { Translate, X, DotsThree, Clipboard, Check, Copy, Notebook, BookBookmark } from '@phosphor-icons/react';
import { mergeParagraphs } from '../services/translator';

interface TranslationWidgetProps {
  onTranslate: (text: string) => Promise<string>;
  provider: string;
  trigger?: { text: string } | null;
  onTriggerConsumed?: () => void;
  onAddNote?: (quote: string, translation: string) => void;
  onAddVocab?: (word: string, meaning: string) => void;
}

const BASE_W = 340;
const BASE_H = 420;

export default function TranslationWidget({ onTranslate, provider, trigger, onTriggerConsumed, onAddNote, onAddVocab }: TranslationWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'source' | 'result' | null>(null);
  const [pasteResult, setPasteResult] = useState('');
  const [position, setPosition] = useState({ x: window.innerWidth - 360, y: 80 });
  const [width, setWidth] = useState(BASE_W);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, w: 0 });

  const scale = width / BASE_W;
  const displayH = Math.round(BASE_H * scale);

  const isYoudaoWeb = provider === 'youdao_web';

  const doCopy = async (text: string, type: 'source' | 'result') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    if (trigger?.text) {
      const cleaned = mergeParagraphs(trigger.text);
      setInput(cleaned);
      setOpen(true);
      setResult('');
      setPasteResult('');
      if (!isYoudaoWeb) {
        setLoading(true);
        onTranslate(cleaned)
          .then((t) => setResult(normalizeResult(t)))
          .catch((e) => setResult('翻译失败: ' + (e instanceof Error ? e.message : '未知错误')))
          .finally(() => setLoading(false));
      }
      onTriggerConsumed?.();
    }
  }, [trigger]);

  const confirmPasteResult = () => {
    setResult(normalizeResult(pasteResult));
    setPasteResult('');
  };

  const handleTranslate = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (isYoudaoWeb) {
      setResult('__youdao_web__');
      setPasteResult('');
    } else {
      setLoading(true);
      setResult('');
      try {
        const t = await onTranslate(text);
        setResult(normalizeResult(t));
      } catch (err) {
        setResult('翻译失败: ' + (err instanceof Error ? err.message : '未知错误'));
      } finally {
        setLoading(false);
      }
    }
  };

  function normalizeResult(text: string): string {
    return text.replace(/\n{2,}/g, '\n').replace(/\n/g, ' ').trim();
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTranslate();
    }
  };

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = (e.currentTarget as HTMLElement).closest('.trans-widget')!;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { x: e.clientX, w: width };
    setResizing(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - width, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, width]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const dw = e.clientX - resizeStart.current.x;
      setWidth(Math.max(260, Math.min(720, resizeStart.current.w + dw)));
    };
    const onUp = () => setResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  const providerLabel = isYoudaoWeb ? '有道翻译' : '内置翻译';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-teal-600 hover:bg-teal-500 active:scale-[0.95] text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
        title="打开翻译窗口"
      >
        <Translate size={20} weight="bold" />
      </button>
    );
  }

  const showResult = result || loading;

  return (
    <div
      className="trans-widget fixed z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
      style={{ left: position.x, top: position.y, width, height: displayH, ...(dragging || resizing ? { userSelect: 'none' as const } : {}) }}
    >
      <div style={{ zoom: scale, width: BASE_W, height: BASE_H }} className="flex flex-col h-full">
        {/* Header */}
        <div
          onMouseDown={onDragStart}
          className="flex items-center justify-between px-3 py-2.5 bg-teal-600 dark:bg-teal-700 cursor-move select-none shrink-0"
        >
          <div className="flex items-center gap-2">
            <DotsThree size={14} weight="bold" className="text-white/60" />
            <span className="text-xs font-medium text-white">翻译窗口</span>
            <span className="text-[10px] text-white/50 font-normal">· {providerLabel}</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/70 hover:text-white transition-colors px-1 active:scale-[0.95]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Input */}
        <div className={`p-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-col shrink-0 ${!showResult ? 'flex-1' : ''}`}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入英文，按 Enter 翻译"
            className={`w-full text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 resize-none outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors ${!showResult ? 'flex-1' : ''}`}
            style={!showResult ? { minHeight: 0 } : {}}
            rows={3}
          />
          <button
            onClick={handleTranslate}
            disabled={loading || !input.trim()}
            className="mt-2 w-full py-1.5 text-xs bg-teal-600 hover:bg-teal-500 dark:bg-teal-700 dark:hover:bg-teal-600 text-white rounded-md transition-all duration-200 active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-1 shrink-0"
          >
            <Translate size={12} weight="bold" />
            {loading ? '翻译中...' : isYoudaoWeb ? '生成翻译指引' : '翻译'}
          </button>
        </div>

        {/* Result */}
        {showResult && (
          <div className="p-3 flex-1 overflow-y-auto min-h-0">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1 shrink-0">翻译结果</p>

            {loading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-zinc-400 dark:text-zinc-500">正在翻译...</span>
              </div>
            ) : result === '__youdao_web__' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => doCopy(input, 'source')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-600 hover:bg-teal-500 dark:bg-teal-700 dark:hover:bg-teal-600 text-white rounded-md transition-all duration-200 active:scale-[0.97]"
                  >
                    {copied === 'source' ? <Check size={12} weight="bold" /> : <Copy size={12} />}
                    {copied === 'source' ? '已复制' : '复制原文'}
                  </button>
                </div>
                <a
                  href="https://fanyi.youdao.com/#/TextTranslate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2 text-xs text-center bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-md transition-all duration-200 active:scale-[0.97]"
                >
                  打开有道翻译 →
                </a>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  ① 点击"复制原文" → ② 点击"打开有道翻译" → ③ 在有道页面粘贴（Ctrl+V） → ④ 将中文结果粘贴到下方
                </p>
                <textarea
                  value={pasteResult}
                  onChange={(e) => setPasteResult(e.target.value)}
                  placeholder="在此粘贴有道翻译的结果..."
                  className="w-full text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 resize-none outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
                  rows={3}
                />
                <button
                  onClick={confirmPasteResult}
                  disabled={!pasteResult.trim()}
                  className="w-full py-1.5 text-xs bg-teal-600 hover:bg-teal-500 dark:bg-teal-700 dark:hover:bg-teal-600 text-white rounded-md transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
                >
                  确认翻译结果
                </button>
                {pasteResult.trim() && (
                  <div className="flex items-center gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    {onAddNote && (
                      <button
                        onClick={() => { onAddNote(input, normalizeResult(pasteResult)); setResult(normalizeResult(pasteResult)); setPasteResult(''); }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      >
                        <Notebook size={11} />
                        全部加入笔记
                      </button>
                    )}
                    {onAddVocab && (
                      <button
                        onClick={() => { onAddVocab(input, normalizeResult(pasteResult)); setResult(normalizeResult(pasteResult)); setPasteResult(''); }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      >
                        <BookBookmark size={11} />
                        全部加入单词
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{result}</p>
                <div className="flex items-center gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                  <button
                    onClick={() => doCopy(result, 'result')}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-teal-500 dark:hover:text-teal-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                  >
                    {copied === 'result' ? <Check size={11} weight="bold" className="text-teal-500" /> : <Clipboard size={11} />}
                    {copied === 'result' ? '已复制' : '复制'}
                  </button>
                  {onAddNote && (
                    <button
                      onClick={() => onAddNote(input, result)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    >
                      <Notebook size={11} />
                      加入笔记
                    </button>
                  )}
                  {onAddVocab && (
                    <button
                      onClick={() => onAddVocab(input, result)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    >
                      <BookBookmark size={11} />
                      加入单词
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize handle — outside zoom, absolute to outer container */}
      <div
        onMouseDown={onResizeStart}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-zinc-300 dark:text-zinc-600">
          <path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

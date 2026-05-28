import { useState, useRef, useEffect } from 'react';
import { Translate, X, DotsThree } from '@phosphor-icons/react';

interface TranslationWidgetProps {
  onTranslate: (text: string) => Promise<string>;
  /** External trigger: set this to auto-open and translate */
  trigger?: { text: string } | null;
  onTriggerConsumed?: () => void;
}

export default function TranslationWidget({ onTranslate, trigger, onTriggerConsumed }: TranslationWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 360, y: 80 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Handle external trigger
  useEffect(() => {
    if (trigger?.text) {
      setInput(trigger.text);
      setOpen(true);
      setResult('');
      setLoading(true);
      onTranslate(trigger.text)
        .then((t) => setResult(t))
        .catch((e) => setResult('翻译失败: ' + (e instanceof Error ? e.message : '未知错误')))
        .finally(() => setLoading(false));
      onTriggerConsumed?.();
    }
  }, [trigger, onTranslate, onTriggerConsumed]);

  const handleTranslate = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setResult('');
    try {
      const t = await onTranslate(text);
      setResult(t);
    } catch (err) {
      setResult('翻译失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 340, e.clientX - dragOffset.current.x)),
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
  }, [dragging]);

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

  return (
    <div
      className="trans-widget fixed z-50 w-[340px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
      style={{ left: position.x, top: position.y, ...(dragging ? { userSelect: 'none' as const } : {}) }}
    >
      {/* Header */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 py-2.5 bg-teal-600 dark:bg-teal-700 cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <DotsThree size={14} weight="bold" className="text-white/60" />
          <span className="text-xs font-medium text-white">翻译窗口</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/70 hover:text-white transition-colors px-1 active:scale-[0.95]"
        >
          <X size={15} />
        </button>
      </div>

      {/* Input */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入英文，按 Enter 翻译"
          className="w-full text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md px-3 py-2 resize-none outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
          rows={3}
        />
        <button
          onClick={handleTranslate}
          disabled={loading || !input.trim()}
          className="mt-2 w-full py-1.5 text-xs bg-teal-600 hover:bg-teal-500 dark:bg-teal-700 dark:hover:bg-teal-600 text-white rounded-md transition-all duration-200 active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-1"
        >
          <Translate size={12} weight="bold" />
          {loading ? '翻译中...' : '翻译'}
        </button>
      </div>

      {/* Result */}
      {(result || loading) && (
        <div className="p-3 max-h-[220px] overflow-y-auto">
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1">翻译结果</p>
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-zinc-400 dark:text-zinc-500">正在翻译...</span>
            </div>
          ) : (
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">{result}</p>
          )}
        </div>
      )}
    </div>
  );
}

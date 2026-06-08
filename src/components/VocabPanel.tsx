import { useState } from 'react';
import type { VocabWord } from '../types';
import { Trash, FileDoc, BookBookmark } from '@phosphor-icons/react';

interface VocabPanelProps {
  words: VocabWord[];
  onUpdate: (word: VocabWord) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onExport: () => void;
}

export default function VocabPanel({ words, onUpdate, onDelete, onClear, onExport }: VocabPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMeaning, setEditMeaning] = useState('');
  const [editComment, setEditComment] = useState('');

  const startEdit = (w: VocabWord) => {
    setEditingId(w.id);
    setEditMeaning(w.meaning);
    setEditComment(w.comment);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const w = words.find(v => v.id === editingId);
    if (!w) return;
    onUpdate({ ...w, meaning: editMeaning, comment: editComment });
    setEditingId(null);
  };

  return (
    <div className="h-[calc(100vh-52px)] flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookBookmark size={18} weight="fill" className="text-teal-500" />
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">单词本</h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{words.length} 词</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExport} className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors flex items-center gap-1.5">
              <FileDoc size={13} />
              导出
            </button>
            <button onClick={onClear} className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors">
              清空
            </button>
          </div>
        </div>
      </div>

      {/* Word List */}
      <div className="flex-1 overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117] px-4 py-3 space-y-2">
        {words.length === 0 && (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
            <BookBookmark size={36} weight="thin" className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">暂无单词</p>
            <p className="text-xs mt-1">阅读时选中单词可添加到单词本</p>
          </div>
        )}
        {[...words].reverse().map((w) => (
          <div key={w.id} className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 shadow-sm">
            {editingId === w.id ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{w.word}</span>
                  <button onClick={() => onDelete(w.id)} className="p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors active:scale-90" title="删除">
                    <Trash size={13} />
                  </button>
                </div>
                <input
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } }}
                  placeholder="释义..."
                  autoFocus
                  className="w-full text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
                />
                <input
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="备注..."
                  className="w-full text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{w.word}</span>
                  <button onClick={() => onDelete(w.id)} className="p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors active:scale-90" title="删除">
                    <Trash size={13} />
                  </button>
                </div>
                {w.meaning ? (
                  <button
                    onClick={() => startEdit(w)}
                    className="text-xs text-zinc-500 dark:text-zinc-400 text-left w-full hover:text-teal-500 dark:hover:text-teal-400 transition-colors cursor-text"
                  >
                    {w.meaning}
                  </button>
                ) : (
                  <button
                    onClick={() => startEdit(w)}
                    className="text-[10px] text-zinc-300 dark:text-zinc-600 hover:text-teal-400 dark:hover:text-teal-500 transition-colors"
                  >
                    点击添加释义
                  </button>
                )}
                {w.exampleSentence && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">"{w.exampleSentence}"</p>}
                {w.comment && <p className="text-[10px] text-zinc-500 dark:text-zinc-400">备注: {w.comment}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

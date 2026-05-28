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
  return (
    <div className="h-[calc(100vh-52px)] flex flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">单词本</h2>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-all duration-200 active:scale-[0.97] flex items-center gap-1.5"
          >
            <FileDoc size={14} />
            导出Word
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded-md transition-all duration-200 active:scale-[0.97] flex items-center gap-1.5"
          >
            <Trash size={14} />
            清除全部
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117]">
        {words.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-600">
            <div className="text-center">
              <BookBookmark size={48} weight="thin" className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">单词本为空</p>
              <p className="text-xs mt-1">阅读时选中文本即可加入单词本</p>
            </div>
          </div>
        )}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {words.map((w) => (
            <div key={w.id} className="p-4 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all duration-200 group border-b border-zinc-100 dark:border-zinc-800/50 mb-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-base font-medium text-zinc-800 dark:text-zinc-100">{w.word}</span>
                    {w.meaning && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">{w.meaning}</span>
                    )}
                  </div>
                  {w.exampleSentence && (
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 italic mb-1.5">"{w.exampleSentence}"</p>
                  )}
                  <textarea
                    value={w.comment}
                    onChange={(e) => onUpdate({ ...w, comment: e.target.value })}
                    placeholder="添加备注..."
                    className="w-full bg-transparent text-sm text-zinc-600 dark:text-zinc-400 placeholder-zinc-300 dark:placeholder-zinc-600 resize-none outline-none"
                    rows={1}
                  />
                  {w.sourceFileName && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1 inline-block">
                      来源: {w.sourceFileName}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`删除单词 "${w.word}"？`)) onDelete(w.id);
                  }}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100 text-xs shrink-0 mt-1 active:scale-[0.95]"
                >
                  <Trash size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

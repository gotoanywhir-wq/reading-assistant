import type { VocabWord } from '../types';
import { Trash, FileDoc, BookBookmark, SidebarSimple } from '@phosphor-icons/react';

interface VocabPanelProps {
  words: VocabWord[];
  onUpdate: (word: VocabWord) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onExport: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function VocabPanel({ words, onUpdate, onDelete, onClear, onExport, collapsed, onToggleCollapse }: VocabPanelProps) {
  if (collapsed) {
    return (
      <div className="w-[40px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col items-center py-3 shrink-0">
        <button onClick={onToggleCollapse} className="text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" title="展开单词本">
          <BookBookmark size={18} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[340px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0 h-[calc(100vh-52px)]">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shadow-sm shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">单词本</h2>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{words.length} 词</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onExport}
            className="px-2 py-1 text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded transition-all duration-200 active:scale-[0.97] flex items-center gap-1"
          >
            <FileDoc size={11} />
            导出
          </button>
          <button
            onClick={onClear}
            className="px-2 py-1 text-[10px] bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded transition-all duration-200 active:scale-[0.97] flex items-center gap-1"
          >
            <Trash size={11} />
            清除
          </button>
          <button onClick={onToggleCollapse} className="text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" title="收起单词本">
            <SidebarSimple size={14} weight="bold" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117] min-h-0">
        {words.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-600">
            <div className="text-center">
              <BookBookmark size={40} weight="thin" className="mx-auto mb-3 opacity-30" />
              <p className="text-xs">单词本为空</p>
              <p className="text-[10px] mt-1">阅读时选中文本即可加入单词本</p>
            </div>
          </div>
        )}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {words.map((w) => (
            <div key={w.id} className="p-3.5 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all duration-200 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{w.word}</span>
                    {w.meaning && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{w.meaning}</span>
                    )}
                  </div>
                  {w.exampleSentence && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic mb-1.5">"{w.exampleSentence}"</p>
                  )}
                  <textarea
                    value={w.comment}
                    onChange={(e) => onUpdate({ ...w, comment: e.target.value })}
                    placeholder="添加备注..."
                    className="w-full bg-transparent text-xs text-zinc-600 dark:text-zinc-400 placeholder-zinc-300 dark:placeholder-zinc-600 resize-none outline-none"
                    rows={1}
                  />
                  {w.sourceFileName && (
                    <span className="text-[9px] text-zinc-400 dark:text-zinc-600 mt-0.5 inline-block">
                      来源: {w.sourceFileName}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { if (confirm(`删除单词 "${w.word}"？`)) onDelete(w.id); }}
                  className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100 text-xs shrink-0 mt-0.5 active:scale-[0.95]"
                >
                  <Trash size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

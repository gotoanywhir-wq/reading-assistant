import type { VocabWord } from '../types';

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
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">单词本</h2>
        <div className="flex gap-2">
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors"
          >
            导出Word
          </button>
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-500 rounded-md transition-colors"
          >
            清除全部
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f5f5f7]">
        {words.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-sm">单词本为空</p>
              <p className="text-xs mt-1">阅读时选中文本即可加入单词本</p>
            </div>
          </div>
        )}
        <div className="divide-y divide-gray-100">
          {words.map((w) => (
            <div key={w.id} className="p-4 bg-white hover:bg-gray-50 transition-colors group border-b border-gray-100 mb-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-base font-medium text-gray-800">{w.word}</span>
                    {w.meaning && (
                      <span className="text-sm text-gray-500">{w.meaning}</span>
                    )}
                  </div>
                  {w.exampleSentence && (
                    <p className="text-sm text-gray-400 italic mb-1.5">"{w.exampleSentence}"</p>
                  )}
                  <textarea
                    value={w.comment}
                    onChange={(e) => onUpdate({ ...w, comment: e.target.value })}
                    placeholder="添加备注..."
                    className="w-full bg-transparent text-sm text-gray-600 placeholder-gray-300 resize-none outline-none"
                    rows={1}
                  />
                  {w.sourceFileName && (
                    <span className="text-[10px] text-gray-400 mt-1 inline-block">
                      来源: {w.sourceFileName}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`删除单词 "${w.word}"？`)) onDelete(w.id);
                  }}
                  className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-xs shrink-0 mt-1"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

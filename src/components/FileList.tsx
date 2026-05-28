import { useRef, useState } from 'react';
import type { FileRecord, VocabWord } from '../types';

interface FileListProps {
  files: FileRecord[];
  currentFileId: string | null;
  onSelect: (file: FileRecord) => void;
  onDelete: (id: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConvertPdf: (file: FileRecord) => void;
  vocabWords: VocabWord[];
  onVocabUpdate: (word: VocabWord) => void;
}

export default function FileList({ files, currentFileId, onSelect, onDelete, onUpload, onConvertPdf, vocabWords, onVocabUpdate }: FileListProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleConvert = async (e: React.MouseEvent, file: FileRecord) => {
    e.stopPropagation();
    setConvertingId(file.id);
    try {
      await onConvertPdf(file);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="w-[240px] border-r border-gray-200 bg-white flex flex-col shrink-0">
      {/* Upload button */}
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
        >
          + 上传文件
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={onUpload}
          className="hidden"
        />
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {files.length === 0 && (
          <p className="text-gray-400 text-xs text-center mt-6 px-3">暂无文件</p>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onSelect(file)}
            className={`group px-3 py-2.5 cursor-pointer border-b border-gray-50 transition-colors ${
              currentFileId === file.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs">{file.type === 'pdf' ? '📄' : '📝'}</span>
              <span className="text-sm truncate flex-1">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`删除 ${file.name}？`)) onDelete(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity text-xs shrink-0"
              >
                ✕
              </button>
            </div>
            {file.type === 'pdf' && (
              <button
                onClick={(e) => handleConvert(e, file)}
                disabled={convertingId === file.id}
                className="mt-1.5 text-[11px] px-2 py-0.5 rounded border transition-colors shrink-0 disabled:opacity-50 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
              >
                {convertingId === file.id ? '转换中...' : '转为Word阅读'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mini vocab — below file list, scrollable */}
      <div className="border-t border-gray-200 flex flex-col min-h-0 max-h-[40vh]">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-xs font-medium text-gray-600">单词本</h3>
          <span className="text-[10px] text-gray-400">{vocabWords.length} 词</span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {vocabWords.length === 0 && (
            <p className="text-gray-400 text-[11px] text-center mt-4 px-3">暂无单词</p>
          )}
          {vocabWords.slice().reverse().slice(0, 30).map((w) => (
            <div key={w.id} className="px-3 py-1.5 border-b border-gray-50 group">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-gray-800">{w.word}</span>
                {w.meaning && <span className="text-[11px] text-gray-500">{w.meaning}</span>}
              </div>
              <textarea
                value={w.comment}
                onChange={(e) => onVocabUpdate({ ...w, comment: e.target.value })}
                placeholder="添加备注..."
                className="w-full mt-1 bg-transparent text-[11px] text-gray-600 placeholder-gray-300 resize-none outline-none leading-snug"
                rows={1}
              />
            </div>
          ))}
          {vocabWords.length > 30 && (
            <p className="text-[10px] text-gray-400 text-center py-1.5">显示最近 30 个，更多请前往单词本页面</p>
          )}
        </div>
      </div>
    </div>
  );
}

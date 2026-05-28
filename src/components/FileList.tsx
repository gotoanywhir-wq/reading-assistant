import { useRef, useState } from 'react';
import type { FileRecord, VocabWord } from '../types';
import { Plus, FilePdf, FileDoc, X, ArrowsLeftRight, BookBookmark } from '@phosphor-icons/react';

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
    <div className="w-[240px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0">
      {/* Upload button */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 active:scale-[0.97] text-white text-sm rounded-md transition-all duration-200 flex items-center justify-center gap-1.5"
        >
          <Plus size={15} weight="bold" />
          上传文件
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
          <div className="flex flex-col items-center justify-center mt-6 px-3 text-zinc-400 dark:text-zinc-600">
            <FilePdf size={28} weight="thin" className="mb-2 opacity-50" />
            <p className="text-xs text-center">暂无文件</p>
          </div>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onSelect(file)}
            className={`group px-3 py-2.5 cursor-pointer border-b border-zinc-50 dark:border-zinc-800/50 transition-all duration-200 ${
              currentFileId === file.id
                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs">
                {file.type === 'pdf' ? <FilePdf size={15} weight="fill" className="text-red-400 dark:text-red-500" /> : <FileDoc size={15} weight="fill" className="text-blue-400 dark:text-blue-500" />}
              </span>
              <span className="text-sm truncate flex-1">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`删除 ${file.name}？`)) onDelete(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity text-xs shrink-0 active:scale-[0.95]"
              >
                <X size={13} />
              </button>
            </div>
            {file.type === 'pdf' && (
              <button
                onClick={(e) => handleConvert(e, file)}
                disabled={convertingId === file.id}
                className="mt-1.5 text-[11px] px-2 py-0.5 rounded border transition-all duration-200 shrink-0 disabled:opacity-50 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.97] flex items-center gap-1"
              >
                <ArrowsLeftRight size={11} weight="bold" />
                {convertingId === file.id ? '转换中...' : '转为Word阅读'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Mini vocab — below file list, scrollable */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 max-h-[40vh]">
        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
            <BookBookmark size={13} weight="fill" />
            单词本
          </h3>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{vocabWords.length} 词</span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {vocabWords.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-4 px-3 text-zinc-400 dark:text-zinc-600">
              <BookBookmark size={22} weight="thin" className="mb-1.5 opacity-50" />
              <p className="text-[11px] text-center">暂无单词</p>
            </div>
          )}
          {vocabWords.slice().reverse().slice(0, 30).map((w) => (
            <div key={w.id} className="px-3 py-1.5 border-b border-zinc-50 dark:border-zinc-800/50 group">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{w.word}</span>
                {w.meaning && <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{w.meaning}</span>}
              </div>
              <textarea
                value={w.comment}
                onChange={(e) => onVocabUpdate({ ...w, comment: e.target.value })}
                placeholder="添加备注..."
                className="w-full mt-1 bg-transparent text-[11px] text-zinc-600 dark:text-zinc-400 placeholder-zinc-300 dark:placeholder-zinc-600 resize-none outline-none leading-snug"
                rows={1}
              />
            </div>
          ))}
          {vocabWords.length > 30 && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 text-center py-1.5">显示最近 30 个，更多请前往单词本页面</p>
          )}
        </div>
      </div>
    </div>
  );
}

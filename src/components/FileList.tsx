import { useRef, useState } from 'react';
import type { FileRecord } from '../types';
import { Plus, FilePdf, FileDoc, X, ArrowsLeftRight, SidebarSimple } from '@phosphor-icons/react';

interface FileListProps {
  files: FileRecord[];
  currentFileId: string | null;
  onSelect: (file: FileRecord) => void;
  onDelete: (id: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConvertPdf: (file: FileRecord) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function FileList({ files, currentFileId, onSelect, onDelete, onUpload, onConvertPdf, collapsed, onToggleCollapse }: FileListProps) {
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

  if (collapsed) {
    return (
      <div className="w-[40px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col items-center py-3 shrink-0">
        <button onClick={onToggleCollapse} className="text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" title="展开文件列表">
          <SidebarSimple size={18} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[180px] border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0">
      {/* Header with collapse toggle */}
      <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 py-1.5 px-2.5 bg-teal-600 hover:bg-teal-500 active:scale-[0.97] text-white text-xs rounded-md transition-all duration-200 flex items-center justify-center gap-1"
        >
          <Plus size={13} weight="bold" />
          上传
        </button>
        <button onClick={onToggleCollapse} className="text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors shrink-0" title="收起文件列表">
          <SidebarSimple size={16} weight="bold" />
        </button>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" onChange={onUpload} className="hidden" />

      {/* File list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-4 px-2 text-zinc-400 dark:text-zinc-600">
            <FilePdf size={22} weight="thin" className="mb-1.5 opacity-50" />
            <p className="text-[10px] text-center">暂无文件</p>
          </div>
        )}
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onSelect(file)}
            className={`group px-2.5 py-2 cursor-pointer border-b border-zinc-50 dark:border-zinc-800/50 transition-all duration-200 ${
              currentFileId === file.id
                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] shrink-0">
                {file.type === 'pdf' ? <FilePdf size={13} weight="fill" className="text-red-400 dark:text-red-500" /> : <FileDoc size={13} weight="fill" className="text-blue-400 dark:text-blue-500" />}
              </span>
              <span className="text-xs truncate flex-1">{file.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`删除 ${file.name}？`)) onDelete(file.id); }}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity shrink-0 active:scale-[0.95]"
              >
                <X size={11} />
              </button>
            </div>
            {file.type === 'pdf' && (
              <button
                onClick={(e) => handleConvert(e, file)}
                disabled={convertingId === file.id}
                className="mt-1 text-[10px] px-1.5 py-0.5 rounded border transition-all duration-200 disabled:opacity-50 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-[0.97] flex items-center gap-0.5"
              >
                <ArrowsLeftRight size={9} weight="bold" />
                {convertingId === file.id ? '转换中...' : '转Word'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

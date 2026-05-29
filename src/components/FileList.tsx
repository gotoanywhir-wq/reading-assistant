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
  open: boolean;
  onToggle: () => void;
}

export default function FileList({ files, currentFileId, onSelect, onDelete, onUpload, onConvertPdf, open, onToggle }: FileListProps) {
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
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-7 h-14 bg-white dark:bg-zinc-900 border border-l-0 border-zinc-200 dark:border-zinc-700 rounded-r-lg flex items-center justify-center text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-all duration-200 shadow-sm"
        title={open ? '收起文件面板' : '展开文件面板'}
      >
        <SidebarSimple size={14} weight="bold" className={open ? 'rotate-180' : ''} />
      </button>

      {/* Drawer panel */}
      <div
        className={`h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
          open ? 'w-[220px]' : 'w-0'
        }`}
      >
        {/* Upload button */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 active:scale-[0.97] text-white text-sm rounded-md transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <Plus size={15} weight="bold" />
            上传文件
          </button>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" onChange={onUpload} className="hidden" />
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
                  onClick={(e) => { e.stopPropagation(); if (confirm(`删除 ${file.name}？`)) onDelete(file.id); }}
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
      </div>
    </>
  );
}

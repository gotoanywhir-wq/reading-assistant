import { useState, useRef, useEffect } from 'react';
import type { Note } from '../types';
import { Star, Trash, Download, BookBookmark, SidebarSimple } from '@phosphor-icons/react';

interface NotePanelProps {
  notes: Note[];
  fileName: string;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onExport: (scope: 'all' | 'important' | 'normal') => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type Filter = 'all' | 'important' | 'normal';

export default function NotePanel({ notes, fileName, onUpdate, onDelete, onClear, onExport, collapsed, onToggleCollapse }: NotePanelProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = filter === 'all' ? notes : notes.filter((n) => n.priority === filter);
  const importantCount = notes.filter((n) => n.priority === 'important').length;
  const normalCount = notes.filter((n) => n.priority === 'normal').length;

  if (collapsed) {
    return (
      <div className="w-[40px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col items-center py-3 shrink-0">
        <button onClick={onToggleCollapse} className="text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors" title="展开笔记">
          <SidebarSimple size={18} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate flex-1">{fileName}</h2>
        <button onClick={onToggleCollapse} className="text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors shrink-0 ml-1" title="收起笔记">
          <SidebarSimple size={14} weight="bold" />
        </button>
        {notes.length > 0 && (
          <div className="flex gap-1 ml-1">
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="px-2 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded transition-all duration-200 flex items-center gap-0.5"
              >
                <Download size={10} />
                导出
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-0.5 min-w-[100px]">
                  {([
                    { id: 'all' as const, label: '全部' },
                    { id: 'important' as const, label: '重点', icon: <Star size={9} weight="fill" className="text-red-500" /> },
                    { id: 'normal' as const, label: '非重点', icon: <Star size={9} weight="fill" className="text-emerald-500" /> },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { onExport(opt.id); setExportOpen(false); }}
                      className="w-full text-left px-2 py-1 text-[10px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onClear}
              className="px-2 py-0.5 text-[10px] bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded transition-all duration-200 flex items-center gap-0.5"
              title="清除所有笔记"
            >
              <Trash size={10} />
              清除
            </button>
          </div>
        )}
      </div>

      {notes.length > 0 && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
          {([
            { id: 'all' as const, label: `${notes.length}` },
            { id: 'important' as const, label: `${importantCount}`, icon: <Star size={9} weight="fill" className="text-red-500" /> },
            { id: 'normal' as const, label: `${normalCount}`, icon: <Star size={9} weight="fill" className="text-emerald-500" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2 py-0.5 text-[10px] rounded transition-all duration-200 flex items-center gap-0.5 ${
                filter === tab.id
                  ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-6 text-zinc-400 dark:text-zinc-600">
            <BookBookmark size={28} weight="thin" className="mb-2 opacity-40" />
            <p className="text-[10px] text-center">选中原文即可摘录</p>
          </div>
        )}
        {filtered.map((note) => (
          <NoteCard key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note, onUpdate, onDelete }: { note: Note; onUpdate: (note: Note) => void; onDelete: (id: string) => void }) {
  const [localNote, setLocalNote] = useState(note.userNote);
  const lastSavedRef = useRef(note.userNote);

  useEffect(() => {
    if (note.userNote !== lastSavedRef.current) {
      setLocalNote(note.userNote);
      lastSavedRef.current = note.userNote;
    }
  }, [note.userNote]);

  const saveIfChanged = () => {
    if (localNote !== lastSavedRef.current) {
      lastSavedRef.current = localNote;
      onUpdate({ ...note, userNote: localNote });
    }
  };

  const togglePriority = () => {
    onUpdate({ ...note, priority: note.priority === 'important' ? 'normal' : 'important' });
  };

  const borderColor = note.priority === 'important' ? 'border-red-400' : 'border-teal-400';

  return (
    <div className={`bg-zinc-50 dark:bg-zinc-900 rounded-md border overflow-hidden group transition-all duration-200 ${
      note.priority === 'important' ? 'border-red-200 dark:border-red-900/50' : 'border-zinc-100 dark:border-zinc-800'
    }`}>
      <div className={`px-2.5 pt-2 pb-1 border-l-2 ${borderColor}`}>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-0.5">原文</p>
        <p className="text-xs text-zinc-700 dark:text-zinc-300 italic leading-relaxed">{note.quoteText}</p>
      </div>

      {note.translation && (
        <div className="px-2.5 py-1 border-l-2 border-amber-400">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-0.5">翻译</p>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{note.translation}</p>
        </div>
      )}

      <div className="px-2.5 py-1.5 border-l-2 border-emerald-400">
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-0.5">笔记</p>
        <textarea
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={saveIfChanged}
          placeholder="写下你的思考..."
          className="w-full bg-transparent text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 resize-none outline-none leading-relaxed min-h-[32px]"
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between px-2.5 py-1 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePriority}
            className={`text-[10px] px-1 py-0.5 rounded transition-all duration-200 active:scale-[0.95] flex items-center gap-0.5 ${
              note.priority === 'important'
                ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <Star size={9} weight="fill" />
            {note.priority === 'important' ? '重点' : '非重点'}
          </button>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-600">
            {new Date(note.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>
        <button
          onClick={() => { if (confirm('删除这条笔记？')) onDelete(note.id); }}
          className="text-[9px] text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100 flex items-center gap-0.5"
        >
          <Trash size={9} />
          删除
        </button>
      </div>
    </div>
  );
}

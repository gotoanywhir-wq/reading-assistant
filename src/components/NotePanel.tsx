import { useState, useRef, useEffect } from 'react';
import type { Note } from '../types';

interface NotePanelProps {
  notes: Note[];
  fileName: string;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onExport: (scope: 'all' | 'important' | 'normal') => void;
}

type Filter = 'all' | 'important' | 'normal';

export default function NotePanel({ notes, fileName, onUpdate, onDelete, onClear, onExport }: NotePanelProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = filter === 'all' ? notes : notes.filter((n) => n.priority === filter);
  const importantCount = notes.filter((n) => n.priority === 'important').length;
  const normalCount = notes.filter((n) => n.priority === 'normal').length;

  return (
    <div className="w-[340px] border-l border-gray-200 bg-white flex flex-col shrink-0">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700 truncate">{fileName}</h2>
        {notes.length > 0 && (
          <div className="flex gap-1.5">
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
              >
                导出 ▾
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                  {([
                    { id: 'all' as const, label: '全部笔记' },
                    { id: 'important' as const, label: '🔴 重点笔记' },
                    { id: 'normal' as const, label: '💚 非重点笔记' },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { onExport(opt.id); setExportOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={onClear}
              className="px-2.5 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-500 rounded transition-colors"
              title="清除所有笔记"
            >
              清除
            </button>
          </div>
        )}
      </div>

      {notes.length > 0 && (
        <div className="flex gap-1 px-3 py-2 border-b border-gray-100">
          {([
            { id: 'all' as const, label: `全部 ${notes.length}` },
            { id: 'important' as const, label: `🔴 ${importantCount}` },
            { id: 'normal' as const, label: `💚 ${normalCount}` },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                filter === tab.id
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {notes.length === 0 && (
          <p className="text-gray-400 text-xs text-center mt-8">选中原文即可摘录到笔记</p>
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

  const borderColor = note.priority === 'important' ? 'border-red-400' : 'border-blue-400';

  return (
    <div className={`bg-gray-50 rounded-lg border overflow-hidden group ${
      note.priority === 'important' ? 'border-red-200' : 'border-gray-100'
    }`}>
      <div className={`px-3 pt-3 pb-1.5 border-l-2 ${borderColor}`}>
        <p className="text-xs text-gray-400 mb-1">原文引用</p>
        <p className="text-sm text-gray-700 italic leading-relaxed">{note.quoteText}</p>
      </div>

      {note.translation && (
        <div className="px-3 py-1.5 border-l-2 border-amber-400">
          <p className="text-xs text-gray-400 mb-1">翻译</p>
          <p className="text-sm text-gray-700 leading-relaxed">{note.translation}</p>
        </div>
      )}

      <div className="px-3 py-2 border-l-2 border-emerald-400">
        <p className="text-xs text-gray-400 mb-1">我的笔记</p>
        <textarea
          value={localNote}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={saveIfChanged}
          placeholder="写下你的思考..."
          className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-300 resize-none outline-none leading-relaxed min-h-[40px]"
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePriority}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
              note.priority === 'important'
                ? 'bg-red-100 text-red-600'
                : 'bg-green-100 text-green-600'
            }`}
            title={note.priority === 'important' ? '标记为非重点' : '标记为重点'}
          >
            {note.priority === 'important' ? '🔴 重点' : '💚 非重点'}
          </button>
          <span className="text-[10px] text-gray-400">
            {new Date(note.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>
        <button
          onClick={() => {
            if (confirm('删除这条笔记？')) onDelete(note.id);
          }}
          className="text-[10px] text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          删除
        </button>
      </div>
    </div>
  );
}

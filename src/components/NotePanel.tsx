import { useState } from 'react';
import type { Note } from '../types';
import { Star, Trash, Download, BookBookmark } from '@phosphor-icons/react';

interface NotePanelProps {
  notes: Note[];
  fileName: string;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onExport: (scope: 'all' | 'important' | 'normal') => void;
  onJumpToNote: (note: Note) => void;
}

type Filter = 'all' | 'important' | 'normal';
type EditableField = 'quote' | 'translation' | 'userNote';

export default function NotePanel({ notes, fileName, onUpdate, onDelete, onClear, onExport, onJumpToNote }: NotePanelProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = filter === 'all' ? notes : notes.filter((n) => n.priority === filter);
  const importantCount = notes.filter((n) => n.priority === 'important').length;
  const normalCount = notes.filter((n) => n.priority === 'normal').length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">{fileName}</h2>
        {notes.length > 0 && (
          <div className="flex gap-1.5">
            <div className="relative">
              <button
                onClick={() => setExportOpen(!exportOpen)}
                className="px-2.5 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded transition-all duration-200 active:scale-[0.97] flex items-center gap-1"
              >
                <Download size={12} />
                导出
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                  {([
                    { id: 'all' as const, label: '全部笔记' },
                    { id: 'important' as const, label: '重点笔记', icon: <Star size={11} weight="fill" className="text-red-500" /> },
                    { id: 'normal' as const, label: '非重点笔记', icon: <Star size={11} weight="fill" className="text-emerald-500" /> },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { onExport(opt.id); setExportOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
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
              className="px-2.5 py-1 text-xs bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 rounded transition-all duration-200 active:scale-[0.97] flex items-center gap-1"
              title="清除所有笔记"
            >
              <Trash size={12} />
              清除
            </button>
          </div>
        )}
      </div>

      {notes.length > 0 && (
        <div className="flex gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          {([
            { id: 'all' as const, label: `全部 ${notes.length}` },
            { id: 'important' as const, label: `${importantCount}`, icon: <Star size={11} weight="fill" className="text-red-500" /> },
            { id: 'normal' as const, label: `${normalCount}`, icon: <Star size={11} weight="fill" className="text-emerald-500" /> },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 text-xs rounded transition-all duration-200 active:scale-[0.97] flex items-center gap-1 ${
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

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-8 text-zinc-400 dark:text-zinc-600">
            <BookBookmark size={36} weight="thin" className="mb-3 opacity-40" />
            <p className="text-xs text-center">选中原文即可摘录到笔记</p>
          </div>
        )}
        {filtered.map((note) => (
          <NoteCard key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} onJump={() => onJumpToNote(note)} />
        ))}
      </div>
    </div>
  );
}

function EditableBlock({
  field,
  label,
  value,
  borderClass,
  placeholder,
  editingField,
  editDraft,
  hoveredField,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  onHoverField,
}: {
  field: EditableField;
  label: string;
  value: string;
  borderClass: string;
  placeholder?: string;
  editingField: EditableField | null;
  editDraft: string;
  hoveredField: EditableField | null;
  onStartEdit: (field: EditableField, value: string) => void;
  onEditChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onHoverField: (field: EditableField | null) => void;
}) {
  const isEditing = editingField === field;
  const isHovered = hoveredField === field;

  if (isEditing) {
    return (
      <div className={`px-3 py-1.5 border-l-2 ${borderClass}`} onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">{label}</p>
        <textarea
          value={editDraft}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(e) => { if (e.key === 'Escape') { onCancelEdit(); } if (e.key === 'Enter' && e.ctrlKey) { onCommitEdit(); } }}
          placeholder={placeholder}
          className="w-full bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 resize-none outline-none leading-relaxed rounded px-2 py-1 min-h-[40px]"
          rows={3}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className={`px-3 py-1.5 border-l-2 ${borderClass} cursor-text group/field relative transition-colors duration-150 ${
        isHovered ? 'bg-zinc-100/60 dark:bg-zinc-800/40' : ''
      }`}
      onClick={(e) => { e.stopPropagation(); onStartEdit(field, value); }}
      onMouseEnter={() => onHoverField(field)}
      onMouseLeave={() => onHoverField(null)}
    >
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">{label}</p>
      {value ? (
        <p className={`text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed ${field === 'quote' ? 'italic' : ''}`}>{value}</p>
      ) : (
        <p className="text-sm text-zinc-300 dark:text-zinc-600 italic">{placeholder || '点击编辑...'}</p>
      )}
      {isHovered && (
        <span className="absolute top-1 right-2 text-[10px] text-zinc-400 dark:text-zinc-500 pointer-events-none">✎ 点击编辑</span>
      )}
    </div>
  );
}

function NoteCard({ note, onUpdate, onDelete, onJump }: { note: Note; onUpdate: (note: Note) => void; onDelete: (id: string) => void; onJump: () => void }) {
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [hoveredField, setHoveredField] = useState<EditableField | null>(null);

  const startEdit = (field: EditableField, value: string) => {
    setEditingField(field);
    setEditDraft(value);
  };

  const commitEdit = () => {
    if (editingField === 'quote' && editDraft !== note.quoteText) {
      onUpdate({ ...note, quoteText: editDraft });
    } else if (editingField === 'translation' && editDraft !== (note.translation || '')) {
      onUpdate({ ...note, translation: editDraft });
    } else if (editingField === 'userNote' && editDraft !== note.userNote) {
      onUpdate({ ...note, userNote: editDraft });
    }
    setEditingField(null);
  };

  const togglePriority = () => {
    onUpdate({ ...note, priority: note.priority === 'important' ? 'normal' : 'important' });
  };

  const borderColor = note.priority === 'important' ? 'border-red-400' : 'border-teal-400';

  return (
    <div
      className={`bg-zinc-50 dark:bg-zinc-900 rounded-lg border overflow-hidden group transition-all duration-200 ${
        note.priority === 'important' ? 'border-red-200 dark:border-red-900/50' : 'border-zinc-100 dark:border-zinc-800'
      }`}
      onClick={onJump}
    >
      <div className="flex-1 min-w-0 relative">
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm('删除这条笔记？')) onDelete(note.id); }}
          className="absolute top-1.5 right-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="删除笔记"
        >
          <Trash size={13} />
        </button>

        <EditableBlock
          field="quote"
          label="原文引用"
          value={note.quoteText}
          borderClass={borderColor}
          placeholder="点击编辑原文..."
          editingField={editingField}
          editDraft={editDraft}
          hoveredField={hoveredField}
          onStartEdit={startEdit}
          onEditChange={setEditDraft}
          onCommitEdit={commitEdit}
          onCancelEdit={() => setEditingField(null)}
          onHoverField={setHoveredField}
        />

        <EditableBlock
          field="translation"
          label="翻译"
          value={note.translation || ''}
          borderClass="border-amber-400"
          placeholder="点击编辑翻译..."
          editingField={editingField}
          editDraft={editDraft}
          hoveredField={hoveredField}
          onStartEdit={startEdit}
          onEditChange={setEditDraft}
          onCommitEdit={commitEdit}
          onCancelEdit={() => setEditingField(null)}
          onHoverField={setHoveredField}
        />

        <EditableBlock
          field="userNote"
          label="我的笔记"
          value={note.userNote}
          borderClass="border-emerald-400"
          placeholder="写下你的思考..."
          editingField={editingField}
          editDraft={editDraft}
          hoveredField={hoveredField}
          onStartEdit={startEdit}
          onEditChange={setEditDraft}
          onCommitEdit={commitEdit}
          onCancelEdit={() => setEditingField(null)}
          onHoverField={setHoveredField}
        />

        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/50" onClick={(e) => e.stopPropagation()}>
          <span
            className={`cursor-pointer transition-all duration-200 active:scale-[0.85] inline-flex ${
              note.priority === 'important'
                ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300'
                : 'text-zinc-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-500'
            }`}
            onClick={togglePriority}
            title={note.priority === 'important' ? '取消重点' : '标记重点'}
          >
            <Star size={14} weight="fill" />
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
            {new Date(note.createdAt).toLocaleString('zh-CN')}
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import type { Note } from '../types';
import { getAllNotes, saveNote, deleteNote, getFiles } from '../db';
import { Star, Trash, BookBookmark, FileDoc, ArrowLeft, Book, MagnifyingGlass } from '@phosphor-icons/react';

type EditableField = 'quote' | 'translation' | 'userNote';
type Filter = 'all' | 'important' | 'normal';

interface FileGroup {
  id: string;
  name: string;
  noteCount: number;
  importantCount: number;
  latestTime: number;
}

export default function NoteReadingPanel() {
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    const [notes, files] = await Promise.all([getAllNotes(), getFiles()]);
    const sorted = notes.sort((a, b) => b.createdAt - a.createdAt);
    setAllNotes(sorted);

    const nameMap: Record<string, string> = {};
    for (const f of files) nameMap[f.id] = f.name;

    const groups: Record<string, FileGroup> = {};
    for (const n of sorted) {
      if (!groups[n.fileId]) {
        groups[n.fileId] = { id: n.fileId, name: nameMap[n.fileId] || '已删除文件', noteCount: 0, importantCount: 0, latestTime: 0 };
      }
      groups[n.fileId].noteCount++;
      if (n.priority === 'important') groups[n.fileId].importantCount++;
      if (n.createdAt > groups[n.fileId].latestTime) groups[n.fileId].latestTime = n.createdAt;
    }
    setFileGroups(Object.values(groups).sort((a, b) => b.latestTime - a.latestTime));
  };

  useEffect(() => { loadData(); }, []);

  const currentNotes = selectedFile
    ? allNotes.filter(n => n.fileId === selectedFile)
    : [];

  const filteredNotes = filter === 'all' ? currentNotes : currentNotes.filter(n => n.priority === filter);

  const currentFileGroup = fileGroups.find(g => g.id === selectedFile);

  const handleUpdate = async (n: Note) => {
    await saveNote(n);
    setAllNotes(prev => prev.map(x => x.id === n.id ? n : x));
  };

  const handleDelete = async (id: string) => {
    await deleteNote(id);
    const remaining = allNotes.filter(x => x.id !== id);
    setAllNotes(remaining);
    if (selectedFile && !remaining.some(n => n.fileId === selectedFile)) {
      setSelectedFile(null);
    }
    loadData();
  };

  const handleClearFile = async () => {
    if (!selectedFile || !confirm('确定要清空这篇文献的所有笔记吗？此操作不可撤销。')) return;
    const fileNotes = allNotes.filter(n => n.fileId === selectedFile);
    for (const n of fileNotes) await deleteNote(n.id);
    setAllNotes(prev => prev.filter(n => n.fileId !== selectedFile));
    setSelectedFile(null);
    loadData();
  };

  const handleExportFile = async () => {
    if (!filteredNotes.length) { alert('没有可导出的笔记'); return; }
    const { exportNotesToWord } = await import('../services/exporter');
    await exportNotesToWord(filteredNotes, currentFileGroup?.name || '读书笔记');
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空全部笔记吗？此操作不可撤销。')) return;
    for (const n of allNotes) await deleteNote(n.id);
    setAllNotes([]);
    setSelectedFile(null);
    setFileGroups([]);
  };

  // File list view
  if (!selectedFile) {
    return (
      <div className="h-[calc(100vh-52px)] flex flex-col">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookBookmark size={18} weight="fill" className="text-teal-500" />
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">笔记阅读</h2>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{allNotes.length} 条</span>
            </div>
            <button onClick={handleClearAll} className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors">
              清空全部
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <div className="relative">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索文献名称..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117] px-4 py-3 space-y-2">
          {fileGroups.length === 0 && !search && (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
              <BookBookmark size={36} weight="thin" className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无笔记</p>
              <p className="text-xs mt-1">阅读时选中原文可摘录到笔记</p>
            </div>
          )}
          {search && fileGroups.filter(g => g.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
              <MagnifyingGlass size={28} weight="thin" className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">未找到匹配的文献</p>
            </div>
          )}
          {fileGroups
            .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
            .map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelectedFile(g.id); setFilter('all'); }}
              className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:shadow hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center shrink-0">
                  <Book size={16} weight="fill" className="text-teal-500 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{g.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{g.noteCount} 条笔记</span>
                    {g.importantCount > 0 && (
                      <span className="text-[11px] text-red-400 dark:text-red-500 flex items-center gap-0.5">
                        <Star size={9} weight="fill" />
                        {g.importantCount} 重点
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                  {new Date(g.latestTime).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Note detail view
  return (
    <div className="h-[calc(100vh-52px)] flex flex-col">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors shrink-0"
              title="返回文献列表"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">{currentFileGroup?.name || '笔记'}</h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{currentNotes.length} 条</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleExportFile} className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors flex items-center gap-1.5">
              <FileDoc size={13} />
              导出
         </button>
            <button onClick={handleClearFile} className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors">
              清空
            </button>
          </div>
        </div>
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
        {([
          { id: 'all' as const, label: `全部 ${currentNotes.length}` },
          { id: 'important' as const, label: `${currentFileGroup?.importantCount || 0}`, icon: <Star size={11} weight="fill" className="text-red-500" /> },
          { id: 'normal' as const, label: `${(currentFileGroup?.noteCount || 0) - (currentFileGroup?.importantCount || 0)}`, icon: <Star size={11} weight="fill" className="text-emerald-500" /> },
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

      {/* Note list */}
      <div className="flex-1 overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117] px-4 py-3 space-y-3">
        {filteredNotes.length === 0 && (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
            <BookBookmark size={36} weight="thin" className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">暂无{filter === 'important' ? '重点' : filter === 'normal' ? '非重点' : ''}笔记</p>
          </div>
        )}
        {filteredNotes.map((note) => (
          <NoteReadingCard key={note.id} note={note} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function NoteReadingCard({ note, onUpdate, onDelete }: { note: Note; onUpdate: (note: Note) => void; onDelete: (id: string) => void }) {
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
    <div className={`bg-white dark:bg-zinc-900 rounded-lg border overflow-hidden shadow-sm group transition-all duration-200 ${
      note.priority === 'important' ? 'border-red-200 dark:border-red-900/50' : 'border-zinc-200 dark:border-zinc-800'
    }`}>
      <div className="p-4 relative">
        <button
          onClick={() => { if (confirm('删除这条笔记？')) onDelete(note.id); }}
          className="absolute top-3 right-3 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="删除笔记"
        >
          <Trash size={14} />
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

        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
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

function EditableBlock({
  field, label, value, borderClass, placeholder,
  editingField, editDraft, hoveredField,
  onStartEdit, onEditChange, onCommitEdit, onCancelEdit, onHoverField,
}: {
  field: EditableField; label: string; value: string; borderClass: string; placeholder?: string;
  editingField: EditableField | null; editDraft: string; hoveredField: EditableField | null;
  onStartEdit: (field: EditableField, value: string) => void;
  onEditChange: (value: string) => void;
  onCommitEdit: () => void; onCancelEdit: () => void; onHoverField: (field: EditableField | null) => void;
}) {
  const isEditing = editingField === field;
  const isHovered = hoveredField === field;

  if (isEditing) {
    return (
      <div className={`pl-3 py-1 border-l-2 ${borderClass} mb-2`}>
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">{label}</p>
        <textarea
          value={editDraft}
          onChange={(e) => onEditChange(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(e) => { if (e.key === 'Escape') { onCancelEdit(); } if (e.key === 'Enter' && e.ctrlKey) { onCommitEdit(); } }}
          placeholder={placeholder}
          className="w-full bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 resize-none outline-none leading-relaxed rounded px-2 py-1.5 min-h-[48px]"
          rows={3}
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className={`pl-3 py-1 border-l-2 ${borderClass} cursor-text relative transition-colors duration-150 mb-2 ${
        isHovered ? 'bg-zinc-50/80 dark:bg-zinc-800/40' : ''
      }`}
      onClick={() => onStartEdit(field, value)}
      onMouseEnter={() => onHoverField(field)}
      onMouseLeave={() => onHoverField(null)}
    >
      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1">{label}</p>
      {value ? (
        <p className={`text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed ${field === 'quote' ? 'italic' : ''}`}>{value}</p>
      ) : (
        <p className="text-sm text-zinc-300 dark:text-zinc-600 italic">{placeholder || '点击编辑...'}</p>
      )}
      {isHovered && (
        <span className="absolute top-0.5 right-0 text-[10px] text-zinc-400 dark:text-zinc-500 pointer-events-none">✎</span>
      )}
    </div>
  );
}

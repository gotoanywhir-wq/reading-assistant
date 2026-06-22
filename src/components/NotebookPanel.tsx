import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import type { NotebookFolder, NotebookEntry } from '../types';
import {
  getNotebookFoldersByLanguage,
  saveNotebookFolder,
  deleteNotebookFolder,
  getNotebookEntriesByFolder,
  saveNotebookEntry,
  deleteNotebookEntry,
} from '../db';
import type { Editor } from '@tiptap/react';
import {
  Notebook,
  FolderSimple,
  Plus,
  Trash,
  ArrowLeft,
  PencilSimple,
  Tag,
  Check,
  X,
  MagnifyingGlass,
  CaretRight,
  FolderOpen,
  DownloadSimple,
  Palette,
} from '@phosphor-icons/react';

type Language = 'zh' | 'en';

const NOTE_COLORS = [
  { id: 'slate', label: '石墨', bg: 'bg-zinc-100 dark:bg-zinc-800', border: 'border-zinc-300 dark:border-zinc-600', dot: 'bg-zinc-400', text: 'text-zinc-700 dark:text-zinc-200' },
  { id: 'rose', label: '玫瑰', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-400', text: 'text-rose-700 dark:text-rose-300' },
  { id: 'amber', label: '琥珀', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300' },
  { id: 'emerald', label: '翠绿', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
  { id: 'sky', label: '天蓝', bg: 'bg-sky-50 dark:bg-sky-950/30', border: 'border-sky-200 dark:border-sky-800', dot: 'bg-sky-400', text: 'text-sky-700 dark:text-sky-300' },
  { id: 'violet', label: '紫罗兰', bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', dot: 'bg-violet-400', text: 'text-violet-700 dark:text-violet-300' },
];

function colorConfig(id: string) {
  return NOTE_COLORS.find(c => c.id === id) || NOTE_COLORS[0];
}

interface FolderNode {
  folder: NotebookFolder;
  children: FolderNode[];
}

function buildTree(folders: NotebookFolder[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];
  for (const f of folders) map.set(f.id, { folder: f, children: [] });
  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) map.get(f.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function flattenIds(nodes: FolderNode[]): string[] {
  const ids: string[] = [];
  for (const n of nodes) { ids.push(n.folder.id); ids.push(...flattenIds(n.children)); }
  return ids;
}

function findNode(nodes: FolderNode[], id: string): FolderNode | null {
  for (const n of nodes) {
    if (n.folder.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

export default function NotebookPanel() {
  const [language, setLanguage] = useState<Language>('zh');
  const [folders, setFolders] = useState<NotebookFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<NotebookEntry | null>(null);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Folder creation
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Entry creation
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryTags, setNewEntryTags] = useState('');
  const [newEntryColor, setNewEntryColor] = useState('slate');

  // Folder rename
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Save toast
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  const tree = useMemo(() => buildTree(folders), [folders]);

  const loadFolders = useCallback(async () => {
    const f = await getNotebookFoldersByLanguage(language);
    setFolders(f.sort((a, b) => a.createdAt - b.createdAt));
  }, [language]);

  const loadEntries = useCallback(async (folderId: string) => {
    const e = await getNotebookEntriesByFolder(folderId);
    setEntries(e.sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  useEffect(() => { loadFolders(); setSelectedFolder(null); setSelectedEntry(null); setEntries([]); setSearch(''); setExpandedIds(new Set()); }, [loadFolders]);
  useEffect(() => { if (selectedFolder) loadEntries(selectedFolder); else setEntries([]); }, [selectedFolder, loadEntries]);

  const toggleExpand = (id: string) => setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const parentId = creatingParentId === '__root__' ? null : creatingParentId;
    await saveNotebookFolder({ id: crypto.randomUUID(), name: newFolderName.trim(), language, parentId, createdAt: Date.now() });
    setNewFolderName(''); setCreatingParentId(null); loadFolders();
    if (parentId) setExpandedIds(prev => new Set(prev).add(parentId));
    showToast('文件夹创建成功');
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('删除文件夹将同时删除其中所有女文件夹和笔记，确定要删除吗？')) return;
    const node = findNode(tree, id);
    const allIds = node ? [id, ...flattenIds(node.children)] : [id];
    for (const fid of allIds) await deleteNotebookFolder(fid);
    if (selectedFolder && allIds.includes(selectedFolder)) { setSelectedFolder(null); setSelectedEntry(null); setEntries([]); }
    loadFolders();
  };

  const handleRenameFolder = async (id: string) => {
    if (!renameDraft.trim()) { setRenamingFolderId(null); return; }
    const folder = folders.find(f => f.id === id);
    if (folder && folder.name !== renameDraft.trim()) { await saveNotebookFolder({ ...folder, name: renameDraft.trim() }); loadFolders(); }
    setRenamingFolderId(null);
  };

  const handleCreateEntry = async () => {
    if (!selectedFolder || !newEntryTitle.trim()) return;
    const tags = newEntryTags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);
    const entry: NotebookEntry = {
      id: crypto.randomUUID(), folderId: selectedFolder, title: newEntryTitle.trim(),
      content: '', tags, color: newEntryColor, createdAt: Date.now(), updatedAt: Date.now(),
    };
    await saveNotebookEntry(entry);
    setNewEntryTitle(''); setNewEntryTags(''); setNewEntryColor('slate'); setShowNewEntry(false);
    loadEntries(selectedFolder); setSelectedEntry(entry);
    showToast('笔记创建成功');
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return;
    await deleteNotebookEntry(id);
    if (selectedEntry?.id === id) setSelectedEntry(null);
    loadEntries(selectedFolder!);
  };

  const handleUpdateEntry = async (updated: NotebookEntry) => {
    await saveNotebookEntry(updated);
    setSelectedEntry(updated);
    loadEntries(selectedFolder!);
  };

  const handleExport = useCallback(async () => {
    if (!entries.length) { alert('没有可导出的笔记'); return; }
    const { exportNotebookEntriesToWord } = await import('../services/exporter');
    const folderName = breadcrumb.map(b => b.name).join('/');
    await exportNotebookEntriesToWord(entries, folderName);
    showToast('导出成功');
  }, [entries]);

  const currentFolder = folders.find(f => f.id === selectedFolder);
  const childFolders = folders.filter(f => f.parentId === selectedFolder);

  const breadcrumb = useMemo(() => {
    if (!selectedFolder) return [];
    const path: NotebookFolder[] = [];
    let cur = folders.find(f => f.id === selectedFolder);
    while (cur) { path.unshift(cur); cur = cur.parentId ? folders.find(f => f.id === cur!.parentId) : undefined; }
    return path;
  }, [selectedFolder, folders]);

  const filteredEntries = search
    ? entries.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    : entries;

  // Toast overlay
  const toastEl = toast && (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg shadow-lg animate-fade-in flex items-center gap-2">
      <Check size={14} weight="bold" />{toast}
    </div>
  );

  // Entry editor
  if (selectedEntry) {
    return (
      <>
        {toastEl}
        <EntryEditor
          entry={selectedEntry} breadcrumb={breadcrumb}
          languageLabel={language === 'zh' ? '中文笔记' : '英文笔记'}
          onBack={() => setSelectedEntry(null)} onUpdate={handleUpdateEntry} onDelete={handleDeleteEntry}
          showToast={showToast}
        />
      </>
    );
  }

  // Folder content
  if (selectedFolder && currentFolder) {
    return (
      <>
        {toastEl}
        <div className="h-[calc(100vh-52px)] flex flex-col">
          {/* Header */}
          <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => { setSelectedFolder(null); setSearch(''); }} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors shrink-0"><ArrowLeft size={16} /></button>
                <Breadcrumb items={breadcrumb} onSelect={setSelectedFolder} />
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{entries.length} 条</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => { setCreatingParentId(selectedFolder); setNewFolderName(''); }} className="px-2.5 py-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1"><Plus size={11} />女文件夹</button>
                <button onClick={() => { setShowNewEntry(true); setNewEntryTitle(''); setNewEntryTags(''); setNewEntryColor('slate'); }} className="px-2.5 py-1 text-[11px] bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors flex items-center gap-1"><Plus size={11} />新建笔记</button>
                <button onClick={handleExport} className="px-2.5 py-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1"><DownloadSimple size={11} />导出</button>
                <button onClick={() => handleDeleteFolder(selectedFolder)} className="px-2.5 py-1 text-[11px] bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors">删除</button>
              </div>
            </div>
          </div>

          {/* Create subfolder */}
          {creatingParentId !== null && creatingParentId !== '__root__' && (
            <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
              <div className="flex gap-2">
                <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="女文件夹名称..." autoFocus onKeyDown={e => { if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder(); if (e.key === 'Escape') setCreatingParentId(null); }} className="flex-1 px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors" />
                <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="px-2.5 py-1.5 text-[11px] bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-md transition-colors flex items-center gap-1"><Check size={11} />创建</button>
                <button onClick={() => setCreatingParentId(null)} className="px-2.5 py-1.5 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-md transition-colors">取消</button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
            <div className="relative">
              <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索笔记..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors" />
            </div>
          </div>

          {/* Subfolder chips */}
          {childFolders.length > 0 && (
            <div className="px-4 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
              <div className="flex gap-1.5 flex-wrap">
                {childFolders.map(cf => (
                  <button key={cf.id} onClick={() => { setSelectedFolder(cf.id); setSearch(''); }} className="px-2 py-0.5 text-[11px] bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors flex items-center gap-1"><FolderSimple size={11} />{cf.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* New entry form */}
          {showNewEntry && (
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 space-y-2">
              <input value={newEntryTitle} onChange={e => setNewEntryTitle(e.target.value)} placeholder="笔记标题..." autoFocus onKeyDown={e => { if (e.key === 'Enter' && newEntryTitle.trim()) handleCreateEntry(); }} className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors" />
              <input value={newEntryTags} onChange={e => setNewEntryTags(e.target.value)} placeholder="标签（逗号分隔，可选）..." onKeyDown={e => { if (e.key === 'Enter' && newEntryTitle.trim()) handleCreateEntry(); }} className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors" />
              <div className="flex items-center gap-1.5">
                <Palette size={12} className="text-zinc-400 dark:text-zinc-500" />
                {NOTE_COLORS.map(c => (
                  <button key={c.id} onClick={() => setNewEntryColor(c.id)} className={`w-5 h-5 rounded-full ${c.dot} ring-offset-1 transition-all ${newEntryColor === c.id ? 'ring-2 ring-zinc-400 dark:ring-zinc-300 scale-110' : 'hover:scale-110'}`} title={c.label} />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateEntry} disabled={!newEntryTitle.trim()} className="px-3 py-1 text-[11px] bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-md transition-colors flex items-center gap-1"><Check size={11} />创建</button>
                <button onClick={() => setShowNewEntry(false)} className="px-3 py-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-md transition-colors flex items-center gap-1"><X size={11} />取消</button>
              </div>
            </div>
          )}

          {/* Entry list */}
          <div className="flex-1 overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117] px-4 py-3 space-y-2">
            {filteredEntries.length === 0 && !search && childFolders.length === 0 && (
              <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
                <Notebook size={36} weight="thin" className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">暂无笔记</p>
                <p className="text-xs mt-1">点击「新建笔记」开始记录</p>
              </div>
            )}
            {filteredEntries.length === 0 && search && (
              <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
                <MagnifyingGlass size={28} weight="thin" className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">未找到匹配的笔记</p>
              </div>
            )}
            {filteredEntries.map(entry => {
              const cc = colorConfig(entry.color);
              return (
                <button key={entry.id} onClick={() => setSelectedEntry(entry)}
                  className={`w-full ${cc.bg} rounded-lg border ${cc.border} p-3.5 shadow-sm hover:shadow transition-all duration-200 text-left group`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${cc.text} truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors`}>{entry.title}</p>
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.tags.map((tag, i) => <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded"><Tag size={7} />{tag}</span>)}
                        </div>
                      )}
                      {entry.content && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 line-clamp-2">{stripHtml(entry.content)}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{new Date(entry.updatedAt).toLocaleDateString('zh-CN')}</span>
                      <button onClick={e => { e.stopPropagation(); handleDeleteEntry(entry.id); }} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="删除"><Trash size={13} /></button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </>
    );
  }

  // Root tree view
  return (
    <>
      {toastEl}
      <div className="h-[calc(100vh-52px)] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2">
            <Notebook size={18} weight="fill" className="text-teal-500" />
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">笔记本</h2>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setLanguage('zh')} className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 active:scale-[0.97] ${language === 'zh' ? 'bg-teal-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>中文笔记</button>
            <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-1.5 active:scale-[0.97] ${language === 'en' ? 'bg-teal-600 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>English Notes</button>
          </div>
        </div>

        {/* New root folder form */}
        {creatingParentId === '__root__' && (
          <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
            <div className="flex gap-2">
              <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="文件夹名称..." autoFocus onKeyDown={e => { if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder(); if (e.key === 'Escape') setCreatingParentId(null); }} className="flex-1 px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors" />
              <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="px-2.5 py-1.5 text-[11px] bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-md transition-colors flex items-center gap-1"><Check size={11} />创建</button>
              <button onClick={() => setCreatingParentId(null)} className="px-2.5 py-1.5 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-md transition-colors">取消</button>
            </div>
          </div>
        )}

        {/* Tree */}
        <div className="flex-1 overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{language === 'zh' ? '中文' : 'English'}文件夹</span>
            <button onClick={() => { setCreatingParentId('__root__'); setNewFolderName(''); }} className="px-2 py-0.5 text-[11px] text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md transition-colors flex items-center gap-1"><Plus size={11} />新建文件夹</button>
          </div>

          {tree.length === 0 && (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-600">
              <FolderSimple size={36} weight="thin" className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无文件夹</p>
              <p className="text-xs mt-1">点击「新建文件夹」开始整理笔记</p>
            </div>
          )}

          <div className="space-y-0.5">
            {tree.map(node => (
              <FolderTreeNode key={node.folder.id} node={node} depth={0} expandedIds={expandedIds} onToggleExpand={toggleExpand}
                selectedFolder={null} onSelect={id => { setSelectedFolder(id); setSearch(''); }}
                onAddSubfolder={id => { setCreatingParentId(id); setNewFolderName(''); }}
                onDelete={handleDeleteFolder} onRenameStart={(id, name) => { setRenamingFolderId(id); setRenameDraft(name); }}
                renamingId={renamingFolderId} renameDraft={renameDraft} onRenameChange={setRenameDraft} onRenameCommit={handleRenameFolder} onRenameCancel={() => setRenamingFolderId(null)}
              />
            ))}
          </div>

          {/* Inline subfolder creation */}
          {creatingParentId !== null && creatingParentId !== '__root__' && (
            <div className="mt-2 ml-6 p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-teal-300 dark:border-teal-700">
              <div className="flex gap-2">
                <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="女文件夹名称..." autoFocus onKeyDown={e => { if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder(); if (e.key === 'Escape') setCreatingParentId(null); }} className="flex-1 px-3 py-1 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:border-teal-400 dark:focus:border-teal-500 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors" />
                <button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="px-2 py-1 text-[11px] bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-md transition-colors flex items-center gap-1"><Check size={11} />创建</button>
                <button onClick={() => setCreatingParentId(null)} className="px-2 py-1 text-[11px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-md transition-colors"><X size={11} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Tree node
function FolderTreeNode({ node, depth, expandedIds, onToggleExpand, selectedFolder, onSelect, onAddSubfolder, onDelete, onRenameStart, renamingId, renameDraft, onRenameChange, onRenameCommit, onRenameCancel }: {
  node: FolderNode; depth: number; expandedIds: Set<string>; onToggleExpand: (id: string) => void;
  selectedFolder: string | null; onSelect: (id: string) => void; onAddSubfolder: (id: string) => void;
  onDelete: (id: string) => void; onRenameStart: (id: string, name: string) => void;
  renamingId: string | null; renameDraft: string; onRenameChange: (v: string) => void;
  onRenameCommit: (id: string) => void; onRenameCancel: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.folder.id);
  const isRenaming = renamingId === node.folder.id;
  const pl = 12 + depth * 20;

  return (
    <>
      <div className={`flex items-center gap-1.5 rounded-md transition-all duration-150 group ${selectedFolder === node.folder.id ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
        style={{ paddingLeft: pl, paddingRight: 8, paddingTop: 5, paddingBottom: 5 }}>
        <button onClick={() => onToggleExpand(node.folder.id)} className={`shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''} ${hasChildren ? 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300' : 'opacity-0 pointer-events-none'}`}><CaretRight size={11} /></button>
        {isExpanded && hasChildren ? <FolderOpen size={14} weight="fill" className="text-teal-500 dark:text-teal-400 shrink-0" /> : <FolderSimple size={14} weight="fill" className="text-teal-500 dark:text-teal-400 shrink-0" />}
        {isRenaming ? (
          <input value={renameDraft} onChange={e => onRenameChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onRenameCommit(node.folder.id); if (e.key === 'Escape') onRenameCancel(); }} onBlur={() => onRenameCommit(node.folder.id)} autoFocus onClick={e => e.stopPropagation()} className="flex-1 px-1 py-0.5 text-[13px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors min-w-0" />
        ) : (
          <button onClick={() => onSelect(node.folder.id)} className="flex-1 text-[13px] text-zinc-700 dark:text-zinc-300 truncate text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors min-w-0">{node.folder.name}</button>
        )}
        {!isRenaming && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); onAddSubfolder(node.folder.id); }} className="p-0.5 rounded hover:bg-teal-50 dark:hover:bg-teal-900/30 text-zinc-400 hover:text-teal-500 transition-colors" title="新建女文件夹"><Plus size={11} /></button>
            <button onClick={e => { e.stopPropagation(); onRenameStart(node.folder.id, node.folder.name); }} className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" title="重命名"><PencilSimple size={11} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(node.folder.id); }} className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500 transition-colors" title="删除"><Trash size={11} /></button>
          </div>
        )}
      </div>
      {isExpanded && hasChildren && node.children.map(child => (
        <FolderTreeNode key={child.folder.id} node={child} depth={depth + 1} expandedIds={expandedIds} onToggleExpand={onToggleExpand}
          selectedFolder={selectedFolder} onSelect={onSelect} onAddSubfolder={onAddSubfolder} onDelete={onDelete} onRenameStart={onRenameStart}
          renamingId={renamingId} renameDraft={renameDraft} onRenameChange={onRenameChange} onRenameCommit={onRenameCommit} onRenameCancel={onRenameCancel}
        />
      ))}
    </>
  );
}

// Breadcrumb
function Breadcrumb({ items, onSelect }: { items: NotebookFolder[]; onSelect: (id: string) => void }) {
  return (
    <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto">
      {items.map((f, i) => (
        <div key={f.id} className="flex items-center gap-0.5 shrink-0">
          {i > 0 && <span className="text-[11px] text-zinc-300 dark:text-zinc-600">/</span>}
          <button onClick={() => onSelect(f.id)} className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors truncate max-w-[100px]">{f.name}</button>
        </div>
      ))}
    </div>
  );
}

// Entry Editor
function EntryEditor({ entry, breadcrumb, languageLabel, onBack, onUpdate, onDelete, showToast }: {
  entry: NotebookEntry; breadcrumb: NotebookFolder[]; languageLabel: string;
  onBack: () => void; onUpdate: (entry: NotebookEntry) => void; onDelete: (id: string) => void; showToast: (msg: string) => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [tags, setTags] = useState(entry.tags.join(', '));
  const [color, setColor] = useState(entry.color);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color, Highlight.configure({ multicolor: true }), Placeholder.configure({ placeholder: '开始记录你的想法...' })],
    content: entry.content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (html !== entry.content) {
        onUpdate({ ...entry, content: html, updatedAt: Date.now() });
        showToast('保存成功');
      }
    },
  });

  const handleSaveMeta = async () => {
    const tagArr = tags.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean);
    await onUpdate({ ...entry, title: title.trim() || '无标题', tags: tagArr, color, updatedAt: Date.now() });
    showToast('保存成功');
  };

  const cc = colorConfig(color);

  return (
    <div className="h-[calc(100vh-52px)] flex flex-col">
      {/* Header */}
      <div className={`px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 ${cc.bg} shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onBack} className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors shrink-0"><ArrowLeft size={15} /></button>
            <Breadcrumb items={breadcrumb} onSelect={() => {}} />
            <span className="text-[11px] text-zinc-300 dark:text-zinc-600 shrink-0">/</span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">{languageLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative">
              <button onClick={() => setShowColorPicker(!showColorPicker)} className={`p-1 rounded-md ${cc.dot} text-white`} title="更换颜色"><Palette size={13} /></button>
              {showColorPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 p-2 flex gap-1.5">
                  {NOTE_COLORS.map(c => (
                    <button key={c.id} onClick={() => { setColor(c.id); setShowColorPicker(false); handleSaveMeta(); }} className={`w-6 h-6 rounded-full ${c.dot} ring-offset-1 transition-all ${color === c.id ? 'ring-2 ring-zinc-400 dark:ring-zinc-300 scale-110' : 'hover:scale-110'}`} title={c.label} />
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleSaveMeta} className="px-2.5 py-1 text-[11px] bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors flex items-center gap-1"><Check size={11} />保存</button>
            <button onClick={() => { if (confirm('确定要删除这条笔记吗？')) onDelete(entry.id); }} className="px-2.5 py-1 text-[11px] bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 rounded-md transition-colors">删除</button>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className={`px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 ${cc.bg} shrink-0 space-y-1.5`}>
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={handleSaveMeta} className={`w-full text-lg font-semibold ${cc.text} bg-transparent outline-none placeholder-zinc-300 dark:placeholder-zinc-600`} placeholder="笔记标题" />
        <input value={tags} onChange={e => setTags(e.target.value)} onBlur={handleSaveMeta} className="w-full text-[11px] text-zinc-500 dark:text-zinc-400 bg-transparent outline-none placeholder-zinc-300 dark:placeholder-zinc-600" placeholder="标签（逗号分隔）" />
      </div>

      {/* Toolbar */}
      <div className="px-5 py-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0 flex gap-0.5 flex-wrap items-center">
        <ToolbarBtn action={() => editor?.chain().focus().toggleBold().run()} label="B" className="font-bold" />
        <ToolbarBtn action={() => editor?.chain().focus().toggleItalic().run()} label="I" className="italic" />
        <ToolbarBtn action={() => editor?.chain().focus().toggleStrike().run()} label="S" className="line-through" />
        <ToolbarBtn action={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} label="H2" />
        <ToolbarBtn action={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} label="H3" />
        <ToolbarBtn action={() => editor?.chain().focus().toggleBulletList().run()} label="•" />
        <ToolbarBtn action={() => editor?.chain().focus().toggleOrderedList().run()} label="1." />
        <ToolbarBtn action={() => editor?.chain().focus().toggleBlockquote().run()} label="❝" />
        <ToolbarBtn action={() => editor?.chain().focus().toggleCodeBlock().run()} label="</>" />
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
        <ColorPickerDropdown editor={editor} type="text" />
        <ColorPickerDropdown editor={editor} type="highlight" />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
        <div className="max-w-3xl mx-auto px-5 py-5">
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ action, label, className = '' }: { action: () => void; label: string; className?: string }) {
  return <button onClick={action} className={`px-1.5 py-0.5 text-[11px] rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors ${className}`}>{label}</button>;
}

const TEXT_COLORS = [
  { color: '', label: '默认' },
  { color: '#E11D48', label: '红' },
  { color: '#D97706', label: '橙' },
  { color: '#CA8A04', label: '黄' },
  { color: '#059669', label: '绿' },
  { color: '#0284C7', label: '蓝' },
  { color: '#7C3AED', label: '紫' },
  { color: '#6B7280', label: '灰' },
];

const HIGHLIGHT_COLORS = [
  { color: '', label: '取消' },
  { color: '#FDE68A', label: '黄' },
  { color: '#FECACA', label: '红' },
  { color: '#A7F3D0', label: '绿' },
  { color: '#BAE6FD', label: '蓝' },
  { color: '#DDD6FE', label: '紫' },
  { color: '#FED7AA', label: '橙' },
];

function ColorPickerDropdown({ editor, type }: { editor: Editor | null; type: 'text' | 'highlight' }) {
  const [open, setOpen] = useState(false);
  const colors = type === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS;

  const apply = (color: string) => {
    if (!editor) return;
    if (type === 'text') {
      editor.chain().focus().setColor(color || '').run();
    } else {
      if (color) {
        editor.chain().focus().toggleHighlight({ color }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    }
    setOpen(false);
  };

  const isText = type === 'text';
  const label = isText ? 'A' : 'HDR';
  const activeColor = isText
    ? (editor?.getAttributes('textStyle').color || '')
    : (editor?.getAttributes('highlight').color || '');

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-1.5 py-0.5 text-[11px] rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-0.5 ${activeColor && isText ? 'border-b-2' : ''}`}
        style={activeColor && isText ? { borderBottomColor: activeColor } : {}}
        title={isText ? '字体颜色' : '高亮颜色'}
      >
        <span className={isText && activeColor ? '' : 'text-zinc-500 dark:text-zinc-400'} style={isText && activeColor ? { color: activeColor } : {}}>
          {label}
        </span>
        {!isText && activeColor && <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: activeColor }} />}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 p-2 min-w-[140px]">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 px-1 pb-1">{isText ? '字体颜色' : '高亮颜色'}</p>
          <div className="space-y-0.5">
            {colors.map(c => (
              <button
                key={c.color || 'none'}
                onClick={() => apply(c.color)}
                className="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <span
                  className="inline-block w-3.5 h-3.5 rounded border border-zinc-200 dark:border-zinc-600"
                  style={c.color ? { backgroundColor: c.color } : { background: 'repeating-conic-gradient(#d4d4d8 0% 25%, transparent 0% 50%) 50% / 8px 8px' }}
                />
                <span className="text-zinc-600 dark:text-zinc-300">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

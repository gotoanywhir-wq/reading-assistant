import { useState, useEffect, useCallback } from 'react';
import type { FileRecord, Note, VocabWord, TranslationSettings } from './types';
import { getFiles, saveFile, deleteFile, getNotesByFile, saveNote, deleteNote, clearAllNotes, getAllVocabWords, saveVocabWord, deleteVocabWord, clearAllVocab, getSettings, saveSettings, exportAllData, importAllData } from './db';
import { translate } from './services/translator';
import { exportNotesToWord, exportVocabToWord } from './services/exporter';
import { convertPdfToDocx } from './services/pdfConverter';
import TranslationWidget from './components/TranslationWidget';
import Layout from './components/Layout';
import FileList from './components/FileList';
import DocumentViewer from './components/DocumentViewer';
import NotePanel from './components/NotePanel';
import VocabPanel from './components/VocabPanel';
import SettingsPanel from './components/SettingsPanel';
import { BookOpenText, BookBookmark } from '@phosphor-icons/react';

function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [currentFile, setCurrentFile] = useState<FileRecord | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);
  const [activeTab, setActiveTab] = useState<'reading' | 'vocabulary' | 'settings'>('reading');
  const [settings, setSettings] = useState<TranslationSettings>({
    id: 'default',
    provider: 'mymemory',
    deeplApiKey: '',
    baiduAppId: '',
    baiduSecretKey: '',
    youdaoAppId: '',
    youdaoAppSecret: '',
  });
  const [translateTrigger, setTranslateTrigger] = useState<{ text: string } | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('darkMode');
    return stored === 'true';
  });
  const [fileListOpen, setFileListOpen] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const handleToggleDark = useCallback(() => setDarkMode(prev => !prev), []);

  const loadFiles = useCallback(async () => { const all = await getFiles(); setFiles(all); }, []);
  const loadNotes = useCallback(async (fid: string) => { const n = await getNotesByFile(fid); setNotes(n.sort((a, b) => a.createdAt - b.createdAt)); }, []);
  const loadVocab = useCallback(async () => { const w = await getAllVocabWords(); setVocabWords(w.sort((a, b) => a.createdAt - b.createdAt)); }, []);
  const loadSettings = useCallback(async () => { setSettings(await getSettings()); }, []);

  useEffect(() => { loadFiles(); loadVocab(); loadSettings(); }, [loadFiles, loadVocab, loadSettings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    const type: 'pdf' | 'word' = ext === 'pdf' ? 'pdf' : 'word';
    if (ext !== 'pdf' && ext !== 'doc' && ext !== 'docx') { alert('仅支持 PDF 和 Word 文件'); return; }
    const rec: FileRecord = { id: crypto.randomUUID(), name: f.name, type, blob: f, createdAt: Date.now() };
    await saveFile(rec); await loadFiles(); setCurrentFile(rec); await loadNotes(rec.id); setActiveTab('reading'); e.target.value = '';
  };

  const handleSelectFile = async (f: FileRecord) => { setCurrentFile(f); await loadNotes(f.id); setActiveTab('reading'); };
  const handleDeleteFile = async (id: string) => { await deleteFile(id); await loadFiles(); if (currentFile?.id === id) { setCurrentFile(null); setNotes([]); } };

  const handleAddNote = async (qt: string, tr?: string) => { if (!currentFile) return; const n: Note = { id: crypto.randomUUID(), fileId: currentFile.id, quoteText: qt, translation: tr || '', userNote: '', priority: 'normal', createdAt: Date.now() }; await saveNote(n); await loadNotes(currentFile.id); };
  const handleUpdateNote = async (n: Note) => { await saveNote(n); await loadNotes(currentFile!.id); };
  const handleDeleteNote = async (id: string) => { await deleteNote(id); await loadNotes(currentFile!.id); };
  const handleClearNotes = async () => { if (!confirm('确定要清除所有笔记吗？此操作不可撤销。')) return; await clearAllNotes(); setNotes([]); if (currentFile) await loadNotes(currentFile.id); };

  const handleAddVocabWord = async (word: string, ex: string) => { let m = ''; try { m = await translate(word, settings); } catch {} const item: VocabWord = { id: crypto.randomUUID(), word, meaning: m, exampleSentence: ex, comment: '', sourceFileId: currentFile?.id || '', sourceFileName: currentFile?.name || '', createdAt: Date.now() }; await saveVocabWord(item); await loadVocab(); };
  const handleUpdateVocabWord = async (w: VocabWord) => { await saveVocabWord(w); await loadVocab(); };
  const handleDeleteVocabWord = async (id: string) => { await deleteVocabWord(id); await loadVocab(); };
  const handleClearVocab = async () => { if (!confirm('确定要清除所有单词吗？此操作不可撤销。')) return; await clearAllVocab(); setVocabWords([]); };

  const handleTranslate = async (text: string): Promise<string> => translate(text, settings);

  const handleExportNotes = async (scope: 'all' | 'important' | 'normal') => { const f = scope === 'all' ? notes : notes.filter(n => n.priority === scope); if (!f.length) { alert('没有可导出的笔记'); return; } await exportNotesToWord(f, currentFile?.name || '读书笔记'); };
  const handleExportVocab = async () => { if (!vocabWords.length) { alert('单词本为空'); return; } await exportVocabToWord(vocabWords); };
  const handleSaveSettings = async (s: TranslationSettings) => { await saveSettings(s); setSettings(s); };

  const handleExportData = async () => { const j = await exportAllData(); const b = new Blob([j], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `小睿快读_备份_${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(u); };
  const handleImportData = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = async (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; try { const t = await f.text(); const r = await importAllData(t); await loadNotes(currentFile?.id || ''); await loadVocab(); await loadSettings(); alert(`导入成功：${r.notes} 条笔记，${r.vocab} 个单词`); } catch (err) { alert('导入失败：' + (err instanceof Error ? err.message : '文件格式错误')); } }; i.click(); };

  const handleConvertPdf = async (file: FileRecord) => { try { const b = await convertPdfToDocx(file.blob); const n = file.name.replace(/\.pdf$/i, '') + '.docx'; const r: FileRecord = { id: crypto.randomUUID(), name: n, type: 'word', blob: b, createdAt: Date.now() }; await saveFile(r); await loadFiles(); setCurrentFile(r); await loadNotes(r.id); setActiveTab('reading'); } catch (err) { alert('转换失败: ' + (err instanceof Error ? err.message : '未知错误')); } };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'reading' && (
        <div className="flex h-[calc(100vh-52px)] relative">
          <FileList
            files={files}
            currentFileId={currentFile?.id || null}
            onSelect={handleSelectFile}
            onDelete={handleDeleteFile}
            onUpload={handleFileUpload}
            onConvertPdf={handleConvertPdf}
            open={fileListOpen}
            onToggle={() => setFileListOpen(o => !o)}
          />
          {currentFile ? (
            <DocumentViewer
              file={currentFile}
              onAddNote={handleAddNote}
              onAddVocab={handleAddVocabWord}
              onTranslate={handleTranslate}
              onTriggerTranslate={setTranslateTrigger}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-600 bg-[#f8f8fa] dark:bg-[#0f1117]">
              <div className="text-center">
                <BookOpenText size={56} weight="thin" className="mx-auto mb-4 opacity-30" />
                <p className="text-lg">上传一份文档开始阅读</p>
                <p className="text-sm mt-1 text-zinc-400 dark:text-zinc-600">支持 PDF 和 Word 文件</p>
              </div>
            </div>
          )}
          {/* Right panel: vocab (top 3) + notes (bottom 7) */}
          <div className="w-[400px] border-l border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 bg-white dark:bg-zinc-950">
            {/* Vocab section — 3/10 height */}
            <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800" style={{ height: '30%' }}>
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                  <BookBookmark size={13} weight="fill" />
                  单词本
                </h3>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-600">{vocabWords.length} 词</span>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 bg-[#f8f8fa] dark:bg-[#0f1117]">
                {vocabWords.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-400 dark:text-zinc-600">
                    <BookBookmark size={24} weight="thin" className="mb-1.5 opacity-40" />
                    <p className="text-[10px]">暂无单词</p>
                  </div>
                )}
                {vocabWords.slice().reverse().slice(0, 50).map((w) => (
                  <div key={w.id} className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/50 group bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{w.word}</span>
                      {w.meaning && <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex-1 truncate">{w.meaning}</span>}
                    </div>
                    {w.exampleSentence && (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic mt-0.5 truncate">"{w.exampleSentence}"</p>
                    )}
                    <textarea
                      value={w.comment}
                      onChange={(e) => handleUpdateVocabWord({ ...w, comment: e.target.value })}
                      placeholder="备注..."
                      className="w-full mt-0.5 bg-transparent text-[10px] text-zinc-600 dark:text-zinc-400 placeholder-zinc-300 dark:placeholder-zinc-600 resize-none outline-none leading-snug"
                      rows={1}
                    />
                  </div>
                ))}
                {vocabWords.length > 50 && (
                  <p className="text-[9px] text-zinc-400 text-center py-1.5">显示最近 50 个，更多请前往单词本页面</p>
                )}
              </div>
            </div>
            {/* Notes section — 7/10 height */}
            <div className="flex flex-col min-h-0" style={{ height: '70%' }}>
              <NotePanel
                notes={notes}
                fileName={currentFile?.name || '读书笔记'}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                onClear={handleClearNotes}
                onExport={handleExportNotes}
              />
            </div>
          </div>
        </div>
      )}
      {activeTab === 'vocabulary' && (
        <VocabPanel
          words={vocabWords}
          onUpdate={handleUpdateVocabWord}
          onDelete={handleDeleteVocabWord}
          onClear={handleClearVocab}
          onExport={handleExportVocab}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onExport={handleExportData}
          onImport={handleImportData}
          darkMode={darkMode}
          onToggleDark={handleToggleDark}
        />
      )}
      <TranslationWidget onTranslate={handleTranslate} trigger={translateTrigger} onTriggerConsumed={() => setTranslateTrigger(null)} />
    </Layout>
  );
}

export default App;

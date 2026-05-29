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
import { BookOpenText } from '@phosphor-icons/react';

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
  const [fileListCollapsed, setFileListCollapsed] = useState(false);
  const [notePanelCollapsed, setNotePanelCollapsed] = useState(false);
  const [vocabPanelCollapsed, setVocabPanelCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const handleToggleDark = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const loadFiles = useCallback(async () => {
    const allFiles = await getFiles();
    setFiles(allFiles);
  }, []);

  const loadNotes = useCallback(async (fileId: string) => {
    const fileNotes = await getNotesByFile(fileId);
    setNotes(fileNotes.sort((a, b) => a.createdAt - b.createdAt));
  }, []);

  const loadVocab = useCallback(async () => {
    const allWords = await getAllVocabWords();
    setVocabWords(allWords.sort((a, b) => a.createdAt - b.createdAt));
  }, []);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    loadFiles();
    loadVocab();
    loadSettings();
  }, [loadFiles, loadVocab, loadSettings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const type: 'pdf' | 'word' = ext === 'pdf' ? 'pdf' : 'word';
    if (ext !== 'pdf' && ext !== 'doc' && ext !== 'docx') {
      alert('仅支持 PDF 和 Word (.doc/.docx) 文件');
      return;
    }

    const record: FileRecord = {
      id: crypto.randomUUID(),
      name: file.name,
      type,
      blob: file,
      createdAt: Date.now(),
    };

    await saveFile(record);
    await loadFiles();
    setCurrentFile(record);
    await loadNotes(record.id);
    setActiveTab('reading');
    e.target.value = '';
  };

  const handleSelectFile = async (file: FileRecord) => {
    setCurrentFile(file);
    await loadNotes(file.id);
    setActiveTab('reading');
  };

  const handleDeleteFile = async (id: string) => {
    await deleteFile(id);
    await loadFiles();
    if (currentFile?.id === id) {
      setCurrentFile(null);
      setNotes([]);
    }
  };

  const handleAddNote = async (quoteText: string, translation?: string) => {
    if (!currentFile) return;
    const note: Note = {
      id: crypto.randomUUID(),
      fileId: currentFile.id,
      quoteText,
      translation: translation || '',
      userNote: '',
      priority: 'normal',
      createdAt: Date.now(),
    };
    await saveNote(note);
    await loadNotes(currentFile.id);
  };

  const handleUpdateNote = async (note: Note) => {
    await saveNote(note);
    await loadNotes(currentFile!.id);
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
    await loadNotes(currentFile!.id);
  };

  const handleClearNotes = async () => {
    if (!confirm('确定要清除所有笔记吗？此操作不可撤销。')) return;
    await clearAllNotes();
    setNotes([]);
    if (currentFile) await loadNotes(currentFile.id);
  };

  const handleAddVocabWord = async (word: string, exampleSentence: string) => {
    let meaning = '';
    try {
      meaning = await translate(word, settings);
    } catch {
      meaning = '';
    }
    const item: VocabWord = {
      id: crypto.randomUUID(),
      word,
      meaning,
      exampleSentence,
      comment: '',
      sourceFileId: currentFile?.id || '',
      sourceFileName: currentFile?.name || '',
      createdAt: Date.now(),
    };
    await saveVocabWord(item);
    await loadVocab();
  };

  const handleUpdateVocabWord = async (word: VocabWord) => {
    await saveVocabWord(word);
    await loadVocab();
  };

  const handleDeleteVocabWord = async (id: string) => {
    await deleteVocabWord(id);
    await loadVocab();
  };

  const handleClearVocab = async () => {
    if (!confirm('确定要清除所有单词吗？此操作不可撤销。')) return;
    await clearAllVocab();
    setVocabWords([]);
  };

  const handleTranslate = async (text: string): Promise<string> => {
    return translate(text, settings);
  };

  const handleExportNotes = async (scope: 'all' | 'important' | 'normal') => {
    const filtered = scope === 'all' ? notes : notes.filter((n) => n.priority === scope);
    if (filtered.length === 0) {
      alert('没有可导出的笔记');
      return;
    }
    await exportNotesToWord(filtered, currentFile?.name || '读书笔记');
  };

  const handleExportVocab = async () => {
    if (vocabWords.length === 0) {
      alert('单词本为空，无内容可导出');
      return;
    }
    await exportVocabToWord(vocabWords);
  };

  const handleSaveSettings = async (s: TranslationSettings) => {
    await saveSettings(s);
    setSettings(s);
  };

  const handleExportData = async () => {
    const json = await exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `小睿快读_备份_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const result = await importAllData(text);
        await loadNotes(currentFile?.id || '');
        await loadVocab();
        await loadSettings();
        alert(`导入成功：${result.notes} 条笔记，${result.vocab} 个单词`);
      } catch (err) {
        alert('导入失败：' + (err instanceof Error ? err.message : '文件格式错误'));
      }
    };
    input.click();
  };

  const handleConvertPdf = async (file: FileRecord) => {
    try {
      const docxBlob = await convertPdfToDocx(file.blob);
      const newName = file.name.replace(/\.pdf$/i, '') + '.docx';
      const record: FileRecord = {
        id: crypto.randomUUID(),
        name: newName,
        type: 'word',
        blob: docxBlob,
        createdAt: Date.now(),
      };
      await saveFile(record);
      await loadFiles();
      setCurrentFile(record);
      await loadNotes(record.id);
      setActiveTab('reading');
    } catch (err) {
      alert('转换失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'reading' && (
        <div className="flex h-[calc(100vh-52px)]">
          <FileList
            files={files}
            currentFileId={currentFile?.id || null}
            onSelect={handleSelectFile}
            onDelete={handleDeleteFile}
            onUpload={handleFileUpload}
            onConvertPdf={handleConvertPdf}
            collapsed={fileListCollapsed}
            onToggleCollapse={() => setFileListCollapsed(c => !c)}
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
          <VocabPanel
            words={vocabWords}
            onUpdate={handleUpdateVocabWord}
            onDelete={handleDeleteVocabWord}
            onClear={handleClearVocab}
            onExport={handleExportVocab}
            collapsed={vocabPanelCollapsed}
            onToggleCollapse={() => setVocabPanelCollapsed(c => !c)}
          />
          <NotePanel
            notes={notes}
            fileName={currentFile?.name || '读书笔记'}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
            onClear={handleClearNotes}
            onExport={handleExportNotes}
            collapsed={notePanelCollapsed}
            onToggleCollapse={() => setNotePanelCollapsed(c => !c)}
          />
        </div>
      )}
      {activeTab === 'vocabulary' && (
        <VocabPanel
          words={vocabWords}
          onUpdate={handleUpdateVocabWord}
          onDelete={handleDeleteVocabWord}
          onClear={handleClearVocab}
          onExport={handleExportVocab}
          collapsed={false}
          onToggleCollapse={() => {}}
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

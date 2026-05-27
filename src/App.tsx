import { useState, useEffect, useCallback } from 'react';
import type { FileRecord, Note, VocabWord, TranslationSettings } from './types';
import { getFiles, saveFile, deleteFile, getNotesByFile, saveNote, deleteNote, clearAllNotes, getAllVocabWords, saveVocabWord, deleteVocabWord, clearAllVocab, getSettings, saveSettings } from './db';
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

  const handleExportNotes = async () => {
    if (notes.length === 0) {
      alert('当前没有笔记可导出');
      return;
    }
    await exportNotesToWord(notes, currentFile?.name || '读书笔记');
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
            vocabWords={vocabWords}
          />
          {currentFile ? (
            <>
              <DocumentViewer
                file={currentFile}
                onAddNote={handleAddNote}
                onAddVocab={handleAddVocabWord}
                onTranslate={handleTranslate}
                vocabWords={vocabWords}
                onTriggerTranslate={setTranslateTrigger}
              />
              <NotePanel
                notes={notes}
                fileName={currentFile.name}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                onClear={handleClearNotes}
                onExport={handleExportNotes}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50">
              <div className="text-center">
                <div className="text-5xl mb-4 opacity-30">📖</div>
                <p className="text-lg">上传一份文档开始阅读</p>
                <p className="text-sm mt-1 text-gray-400">支持 PDF 和 Word 文件</p>
              </div>
            </div>
          )}
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
        />
      )}
      <TranslationWidget onTranslate={handleTranslate} trigger={translateTrigger} onTriggerConsumed={() => setTranslateTrigger(null)} />
    </Layout>
  );
}

export default App;

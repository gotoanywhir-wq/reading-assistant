import { openDB } from 'idb';
import type { FileRecord, Note, VocabWord, TranslationSettings, PageTranslationRecord, NotebookFolder, NotebookEntry } from '../types';

const DB_NAME = 'reading-assistant';
const DB_VERSION = 7;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbPromise: Promise<any> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('fileId', 'fileId');
        }
        if (!db.objectStoreNames.contains('vocabulary')) {
          db.createObjectStore('vocabulary', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pageTranslations')) {
          const ptStore = db.createObjectStore('pageTranslations', { keyPath: 'id' });
          ptStore.createIndex('fileId', 'fileId');
        }
        if (!db.objectStoreNames.contains('notebookFolders')) {
          const folderStore = db.createObjectStore('notebookFolders', { keyPath: 'id' });
          folderStore.createIndex('language', 'language');
          folderStore.createIndex('parentId', 'parentId');
        }
        if (!db.objectStoreNames.contains('notebooks')) {
          const nbStore = db.createObjectStore('notebooks', { keyPath: 'id' });
          nbStore.createIndex('folderId', 'folderId');
        }
      },
    });
  }
  return dbPromise;
}

// Files
export async function saveFile(file: FileRecord): Promise<void> {
  const db = await getDB();
  await db.put('files', file);
}

export async function getFiles(): Promise<FileRecord[]> {
  const db = await getDB();
  return db.getAll('files');
}

export async function getFile(id: string): Promise<FileRecord | undefined> {
  const db = await getDB();
  return db.get('files', id);
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('files', id);
  const notes = await getNotesByFile(id);
  const tx = db.transaction('notes', 'readwrite');
  for (const note of notes) {
    await tx.store.delete(note.id);
  }
  await tx.done;
}

// Notes
export async function saveNote(note: Note): Promise<void> {
  const db = await getDB();
  await db.put('notes', note);
}

export async function getNotesByFile(fileId: string): Promise<Note[]> {
  const db = await getDB();
  const index = db.transaction('notes').store.index('fileId');
  return index.getAll(fileId);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', id);
}

export async function clearAllNotes(): Promise<void> {
  const db = await getDB();
  await db.clear('notes');
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  return db.getAll('notes');
}

// Vocabulary
export async function saveVocabWord(word: VocabWord): Promise<void> {
  const db = await getDB();
  await db.put('vocabulary', word);
}

export async function getAllVocabWords(): Promise<VocabWord[]> {
  const db = await getDB();
  return db.getAll('vocabulary');
}

export async function deleteVocabWord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vocabulary', id);
}

export async function clearAllVocab(): Promise<void> {
  const db = await getDB();
  await db.clear('vocabulary');
}

// Settings
const SETTINGS_ID = 'default';

export async function getSettings(): Promise<TranslationSettings> {
  const db = await getDB();
  const settings = await db.get('settings', SETTINGS_ID);
  if (settings && settings.provider) {
    return { id: SETTINGS_ID, provider: settings.provider };
  }
  return { id: SETTINGS_ID, provider: 'mymemory' as const };
}

export async function saveSettings(settings: TranslationSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}

// Export all data (notes, vocabulary) as JSON
export async function exportAllData(): Promise<string> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  const vocabulary = await db.getAll('vocabulary');
  return JSON.stringify({ notes, vocabulary, version: 1 }, null, 2);
}

// Import data from JSON, merging with existing data
export async function importAllData(json: string): Promise<{ notes: number; vocab: number }> {
  const data = JSON.parse(json);
  if (!data.version) throw new Error('无效的备份文件');
  const db = await getDB();
  const tx = db.transaction(['notes', 'vocabulary'], 'readwrite');
  let notes = 0;
  let vocab = 0;
  if (Array.isArray(data.notes)) {
    for (const note of data.notes) {
      await tx.objectStore('notes').put(note);
      notes++;
    }
  }
  if (Array.isArray(data.vocabulary)) {
    for (const word of data.vocabulary) {
      await tx.objectStore('vocabulary').put(word);
      vocab++;
    }
  }
  await tx.done;
  return { notes, vocab };
}

// Page Translations
export async function savePageTranslation(record: PageTranslationRecord): Promise<void> {
  const db = await getDB();
  await db.put('pageTranslations', record);
}

export async function getPageTranslationsByFile(fileId: string): Promise<PageTranslationRecord[]> {
  const db = await getDB();
  const index = db.transaction('pageTranslations').store.index('fileId');
  return index.getAll(fileId);
}

export async function deletePageTranslationsByFile(fileId: string): Promise<void> {
  const db = await getDB();
  const records = await getPageTranslationsByFile(fileId);
  const tx = db.transaction('pageTranslations', 'readwrite');
  for (const r of records) {
    await tx.store.delete(r.id);
  }
  await tx.done;
}

export async function clearAllPageTranslations(): Promise<void> {
  const db = await getDB();
  await db.clear('pageTranslations');
}

// Notebook Folders
export async function saveNotebookFolder(folder: NotebookFolder): Promise<void> {
  const db = await getDB();
  await db.put('notebookFolders', folder);
}

export async function getNotebookFolders(): Promise<NotebookFolder[]> {
  const db = await getDB();
  return db.getAll('notebookFolders');
}

export async function getNotebookFoldersByLanguage(language: 'zh' | 'en'): Promise<NotebookFolder[]> {
  const db = await getDB();
  const index = db.transaction('notebookFolders').store.index('language');
  return index.getAll(language);
}

export async function deleteNotebookFolder(id: string): Promise<void> {
  const db = await getDB();
  const entries = await getNotebookEntriesByFolder(id);
  const tx = db.transaction(['notebookFolders', 'notebooks'], 'readwrite');
  await tx.objectStore('notebookFolders').delete(id);
  for (const e of entries) {
    await tx.objectStore('notebooks').delete(e.id);
  }
  await tx.done;
}

// Notebooks
export async function saveNotebookEntry(entry: NotebookEntry): Promise<void> {
  const db = await getDB();
  await db.put('notebooks', entry);
}

export async function getNotebookEntriesByFolder(folderId: string): Promise<NotebookEntry[]> {
  const db = await getDB();
  const index = db.transaction('notebooks').store.index('folderId');
  return index.getAll(folderId);
}

export async function deleteNotebookEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notebooks', id);
}

export async function getAllNotebookEntries(): Promise<NotebookEntry[]> {
  const db = await getDB();
  return db.getAll('notebooks');
}

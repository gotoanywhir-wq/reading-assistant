import { openDB } from 'idb';
import type { FileRecord, Note, VocabWord, TranslationSettings } from '../types';

const DB_NAME = 'reading-assistant';
const DB_VERSION = 2;

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
  return settings || {
    id: SETTINGS_ID,
    provider: 'mymemory' as const,
    deeplApiKey: '',
    baiduAppId: '',
    baiduSecretKey: '',
    youdaoAppId: '',
    youdaoAppSecret: '',
  };
}

export async function saveSettings(settings: TranslationSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}

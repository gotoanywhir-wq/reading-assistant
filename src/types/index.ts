export interface FileRecord {
  id: string;
  name: string;
  type: 'pdf' | 'word';
  blob: Blob;
  createdAt: number;
}

export interface Note {
  id: string;
  fileId: string;
  quoteText: string;
  translation: string;
  userNote: string;
  priority: 'important' | 'normal';
  createdAt: number;
  location?: {
    pageNumber: number;
    startOffset: number;
    endOffset: number;
  };
}

export interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  exampleSentence: string;
  comment: string;
  sourceFileId: string;
  sourceFileName: string;
  createdAt: number;
}

export interface PageTranslationRecord {
  id: string;        // `${fileId}-${pageNumber}`
  fileId: string;
  pageNumber: number;
  text: string;
  updatedAt: number;
}

export type TranslationProvider = 'mymemory' | 'youdao_web';

export interface TranslationSettings {
  id: string;
  provider: TranslationProvider;
}

export interface AppTab {
  id: 'reading' | 'vocabulary' | 'settings';
  label: string;
}

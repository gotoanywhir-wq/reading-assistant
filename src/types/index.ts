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

export type TranslationProvider = 'mymemory' | 'deepl' | 'baidu' | 'youdao';

export interface TranslationSettings {
  id: string;
  provider: TranslationProvider;
  deeplApiKey: string;
  baiduAppId: string;
  baiduSecretKey: string;
  youdaoAppId: string;
  youdaoAppSecret: string;
}

export interface AppTab {
  id: 'reading' | 'vocabulary' | 'settings';
  label: string;
}

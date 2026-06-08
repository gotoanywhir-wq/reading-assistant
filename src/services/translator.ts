const isDev = import.meta.env.DEV;

const MYMEMORY_MAX_CHARS = 500;
const MYMEMORY_DE = 'xiaorui-reading@outlook.com';

function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let cut = remaining.lastIndexOf('\n', maxLen);
    if (cut === -1 || cut < maxLen * 0.3) cut = remaining.lastIndexOf('. ', maxLen);
    if (cut === -1 || cut < maxLen * 0.3) cut = remaining.lastIndexOf(' ', maxLen);
    if (cut === -1) cut = maxLen;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }
  return chunks;
}

async function translateMyMemory(text: string): Promise<string> {
  const chunks = splitText(text, MYMEMORY_MAX_CHARS);
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const target = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|zh-CN&de=${encodeURIComponent(MYMEMORY_DE)}`;
      const url = isDev ? target.replace('https://api.mymemory.translated.net', '/api/mymemory') : target;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
      throw new Error(data.responseDetails || '翻译请求失败');
    })
  );
  return results.join('\n');
}

export async function translate(text: string): Promise<string> {
  if (!text.trim()) throw new Error('没有可翻译的文本');
  return translateMyMemory(mergeParagraphs(text));
}

export function mergeParagraphs(raw: string): string {
  const lines = raw.split('\n');
  const result: string[] = [];
  let buf = '';

  const isListItem = (s: string) => /^\s*[-–—•▪▸▶►◆○●■□◎]\s/.test(s) || /^\s*\d+[\.\)]\s/.test(s);
  const isHeadingLike = (s: string) => {
    const t = s.trim();
    return t.length > 0 && t.length < 60 && t === t.toUpperCase() && /[A-Z]/.test(t);
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '') {
      if (buf) { result.push(buf); buf = ''; }
      continue;
    }

    if (isListItem(line) || isHeadingLike(line)) {
      if (buf) { result.push(buf); buf = ''; }
      result.push(trimmed);
      continue;
    }

    if (buf === '') {
      buf = trimmed;
    } else {
      buf += ' ' + trimmed;
    }
  }

  if (buf) result.push(buf);
  return result.join('\n');
}

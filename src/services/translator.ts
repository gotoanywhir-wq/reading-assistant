import md5 from 'blueimp-md5';
import type { TranslationSettings } from '../types';

const isDev = import.meta.env.DEV;

const CORS_PROXIES = [
  (url: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithCorsProxy(url: string, init?: RequestInit): Promise<Response> {
  if (isDev) return fetch(url, init);
  try {
    const res = await fetch(url, init);
    if (res.ok) return res;
  } catch {}
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), init);
      if (res.ok) return res;
    } catch {}
  }
  throw new Error('网络请求失败，CORS 代理不可用');
}

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
      const res = await fetchWithCorsProxy(url);
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

async function translateDeepL(text: string, apiKey: string): Promise<string> {
  const isFreeKey = apiKey.endsWith(':fx');
  const targetUrl = isFreeKey
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
  const body = JSON.stringify({ text: [text], target_lang: 'ZH' });
  const headers = {
    'Authorization': `DeepL-Auth-Key ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const res = isDev
    ? await fetch(targetUrl, { method: 'POST', headers, body })
    : await fetchWithCorsProxy(targetUrl, { method: 'POST', headers, body });
  const data = await res.json();
  if (data.translations?.[0]?.text) return data.translations[0].text;
  throw new Error('DeepL translation failed');
}

const BAIDU_SIGN_MAX_CHARS = 600;
const BAIDU_MAX_CHARS = 6000;

const BAIDU_ERRORS: Record<string, string> = {
  '52000': '成功',
  '52001': '请求超时，请重试',
  '52002': '系统错误，请重试',
  '52003': 'App ID 未授权，请在百度翻译控制台将「服务器IP」设为 0.0.0.0（允许所有IP），并确认已开通「通用翻译API」服务',
  '54000': '必填参数为空',
  '54001': '签名错误，请检查 App ID 和密钥',
  '54003': '访问频率受限，请降低调用频率',
  '54004': '余额不足，请前往百度翻译开放平台充值',
  '54005': '长文本请求过于频繁',
  '58000': '客户端IP非法',
  '58001': '语言不支持',
  '58002': '服务已关闭，请前往控制台开启',
  '90107': '认证失败',
};

async function translateBaiduChunk(chunk: string, appId: string, secretKey: string): Promise<string> {
  const salt = Date.now().toString();
  const signInput = chunk.length <= BAIDU_SIGN_MAX_CHARS
    ? appId + chunk + salt + secretKey
    : appId + chunk.substring(0, BAIDU_SIGN_MAX_CHARS) + salt + secretKey;
  const sign = md5(signInput);
  const target = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(chunk)}&from=en&to=zh&appid=${appId}&salt=${salt}&sign=${sign}`;
  const url = isDev
    ? target.replace('https://api.fanyi.baidu.com', '/api/baidu')
    : target;
  const res = await fetchWithCorsProxy(url);
  const data = await res.json();
  if (data.trans_result?.[0]?.dst) {
    return data.trans_result.map((r: { dst: string }) => r.dst).join('\n');
  }
  const code = String(data.error_code || '');
  throw new Error(BAIDU_ERRORS[code] || `百度翻译错误 (${code}: ${data.error_msg || ''})`);
}

async function translateBaidu(text: string, appId: string, secretKey: string): Promise<string> {
  const chunks = splitText(text, BAIDU_MAX_CHARS);
  const results: string[] = [];
  for (const chunk of chunks) {
    const r = await translateBaiduChunk(chunk, appId, secretKey);
    results.push(r);
    if (chunks.length > 1) await new Promise(r => setTimeout(r, 200));
  }
  return results.join('\n');
}

const YOUDAO_MAX_CHARS = 4800;

const YOUDAO_ERRORS: Record<string, string> = {
  '101': '缺少必填参数',
  '102': '不支持的语言类型',
  '103': '翻译文本过长',
  '104': '不支持的API类型',
  '105': '不支持的签名类型',
  '106': '不支持的响应类型',
  '107': '不支持的加密类型',
  '108': '应用ID无效，请检查是否填写正确',
  '109': '时间戳无效',
  '110': '签名验证失败，请检查应用ID和密钥是否正确',
  '111': '开发者的账号被封禁',
  '112': '余额不足，请充值',
  '113': '请求频率过快，请稍后重试',
  '201': '翻译失败，请稍后重试',
  '202': '翻译失败，请稍后重试',
  '203': '翻译失败，请稍后重试',
  '301': '词典查询失败',
  '302': '词典查询失败',
  '401': '账户已欠费',
  '402': '余额不足，请充值',
  '411': '访问频率受限',
  '412': '访问频率受限',
};

async function translateYoudaoChunk(chunk: string, appId: string, appSecret: string): Promise<string> {
  const salt = Date.now().toString();
  const curtime = Math.round(Date.now() / 1000).toString();
  const truncated = chunk.length <= 20 ? chunk : chunk.substring(0, 10) + chunk.length + chunk.substring(chunk.length - 10);
  const signStr = appId + truncated + salt + curtime + appSecret;
  const sign = await sha256(signStr);
  const target = `https://openapi.youdao.com/api?q=${encodeURIComponent(chunk)}&from=en&to=zh-CHS&appKey=${appId}&salt=${salt}&sign=${sign}&signType=v3&curtime=${curtime}`;
  const url = isDev
    ? target.replace('https://openapi.youdao.com', '/api/youdao')
    : target;
  const res = await fetchWithCorsProxy(url);
  const data = await res.json();
  if (data.translation?.[0]) {
    return data.translation.join('\n');
  }
  const code = String(data.errorCode || '');
  throw new Error(YOUDAO_ERRORS[code] || `有道翻译错误 (${code})`);
}

async function translateYoudao(text: string, appId: string, appSecret: string): Promise<string> {
  const chunks = splitText(text, YOUDAO_MAX_CHARS);
  const results: string[] = [];
  for (const chunk of chunks) {
    const r = await translateYoudaoChunk(chunk, appId, appSecret);
    results.push(r);
    if (chunks.length > 1) await new Promise(r => setTimeout(r, 200));
  }
  return results.join('\n');
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function translate(text: string, settings: TranslationSettings): Promise<string> {
  if (!text.trim()) throw new Error('没有可翻译的文本');
  const cleaned = mergeParagraphs(text);

  switch (settings.provider) {
    case 'mymemory':
      return translateMyMemory(cleaned);
    case 'deepl':
      if (!settings.deeplApiKey) throw new Error('请先在设置中填写 DeepL API Key');
      return translateDeepL(cleaned, settings.deeplApiKey);
    case 'baidu':
      if (!settings.baiduAppId || !settings.baiduSecretKey) {
        throw new Error('请先在设置中填写百度翻译 App ID 和 Secret Key');
      }
      return translateBaidu(cleaned, settings.baiduAppId, settings.baiduSecretKey);
    case 'youdao':
      if (!settings.youdaoAppId || !settings.youdaoAppSecret) {
        throw new Error('请先在设置中填写有道翻译应用ID和应用密钥');
      }
      return translateYoudao(cleaned, settings.youdaoAppId, settings.youdaoAppSecret);
    default:
      return translateMyMemory(cleaned);
  }
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

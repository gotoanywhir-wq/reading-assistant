import type { TranslationSettings } from '../types';

const isDev = import.meta.env.DEV;

function corsProxy(url: string): string {
  if (isDev) return url;
  return `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
}

const MYMEMORY_MAX_CHARS = 500;

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
      const target = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|zh-CN`;
      const res = await fetch(isDev ? target.replace('https://api.mymemory.translated.net', '/api/mymemory') : corsProxy(target));
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
  if (isDev) {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], target_lang: 'ZH' }),
    });
    const data = await res.json();
    if (data.translations?.[0]?.text) return data.translations[0].text;
    throw new Error('DeepL translation failed');
  }
  const res = await fetch(corsProxy(targetUrl), {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], target_lang: 'ZH' }),
  });
  const data = await res.json();
  if (data.translations?.[0]?.text) return data.translations[0].text;
  throw new Error('DeepL translation failed');
}

async function translateBaidu(text: string, appId: string, secretKey: string): Promise<string> {
  const salt = Date.now().toString();
  const sign = await md5(appId + text + salt + secretKey);
  const target = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=en&to=zh&appid=${appId}&salt=${salt}&sign=${sign}`;
  const url = isDev
    ? target.replace('https://api.fanyi.baidu.com', '/api/baidu')
    : corsProxy(target);
  const res = await fetch(url);
  const data = await res.json();
  if (data.trans_result?.[0]?.dst) {
    return data.trans_result.map((r: { dst: string }) => r.dst).join('\n');
  }
  throw new Error(data.error_msg || '百度翻译失败');
}

async function md5(input: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('MD5', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) - h) + input.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16).padStart(32, '0');
  }
}

async function translateYoudao(text: string, appId: string, appSecret: string): Promise<string> {
  const salt = Date.now().toString();
  const curtime = Math.round(Date.now() / 1000).toString();
  const truncated = text.length <= 20 ? text : text.substring(0, 10) + text.length + text.substring(text.length - 10);
  const signStr = appId + truncated + salt + curtime + appSecret;
  const sign = await sha256(signStr);
  const target = `https://openapi.youdao.com/api?q=${encodeURIComponent(text)}&from=en&to=zh-CHS&appKey=${appId}&salt=${salt}&sign=${sign}&signType=v3&curtime=${curtime}`;
  const url = isDev
    ? target.replace('https://openapi.youdao.com', '/api/youdao')
    : corsProxy(target);
  const res = await fetch(url);
  const data = await res.json();
  if (data.translation?.[0]) {
    return data.translation.join('\n');
  }
  throw new Error(data.message || '有道翻译失败');
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function translate(text: string, settings: TranslationSettings): Promise<string> {
  if (!text.trim()) throw new Error('没有可翻译的文本');

  switch (settings.provider) {
    case 'mymemory':
      return translateMyMemory(text);
    case 'deepl':
      if (!settings.deeplApiKey) throw new Error('请先在设置中填写 DeepL API Key');
      return translateDeepL(text, settings.deeplApiKey);
    case 'baidu':
      if (!settings.baiduAppId || !settings.baiduSecretKey) {
        throw new Error('请先在设置中填写百度翻译 App ID 和 Secret Key');
      }
      return translateBaidu(text, settings.baiduAppId, settings.baiduSecretKey);
    case 'youdao':
      if (!settings.youdaoAppId || !settings.youdaoAppSecret) {
        throw new Error('请先在设置中填写有道翻译应用ID和应用密钥');
      }
      return translateYoudao(text, settings.youdaoAppId, settings.youdaoAppSecret);
    default:
      return translateMyMemory(text);
  }
}

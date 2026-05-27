import type { TranslationSettings } from '../types';

async function translateMyMemory(text: string): Promise<string> {
  // Try fetch first, fall back to JSONP
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    throw new Error(data.responseDetails || '翻译请求失败');
  } catch (fetchErr) {
    console.warn('Fetch failed, trying JSONP:', fetchErr);
    return translateMyMemoryJsonp(text);
  }
}

function translateMyMemoryJsonp(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const callbackName = `_mymemory_${Date.now()}`;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('翻译请求超时'));
    }, 10000);

    function cleanup() {
      clearTimeout(timeout);
      delete (window as any)[callbackName];
      const script = document.getElementById(`jsonp-${callbackName}`);
      if (script) script.remove();
    }

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        resolve(data.responseData.translatedText);
      } else {
        reject(new Error(data.responseDetails || '翻译请求失败'));
      }
    };

    const script = document.createElement('script');
    script.id = `jsonp-${callbackName}`;
    script.src = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN&callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('网络请求失败，请检查网络连接'));
    };
    document.head.appendChild(script);
  });
}

async function translateDeepL(text: string, apiKey: string): Promise<string> {
  const isFreeKey = apiKey.endsWith(':fx');
  const baseUrl = isFreeKey
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], target_lang: 'ZH' }),
  });
  const data = await res.json();
  if (data.translations?.[0]?.text) {
    return data.translations[0].text;
  }
  throw new Error('DeepL translation failed');
}

async function translateBaidu(text: string, appId: string, secretKey: string): Promise<string> {
  const salt = Date.now().toString();
  const sign = await md5(appId + text + salt + secretKey);
  const url = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=en&to=zh&appid=${appId}&salt=${salt}&sign=${sign}`;
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
  const url = `https://openapi.youdao.com/api?q=${encodeURIComponent(text)}&from=en&to=zh-CHS&appKey=${appId}&salt=${salt}&sign=${sign}&signType=v3&curtime=${curtime}`;
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

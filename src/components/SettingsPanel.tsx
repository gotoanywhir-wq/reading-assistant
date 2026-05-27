import { useState } from 'react';
import type { TranslationSettings } from '../types';

interface SettingsPanelProps {
  settings: TranslationSettings;
  onSave: (settings: TranslationSettings) => void;
}

export default function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [form, setForm] = useState<TranslationSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-52px)] overflow-y-auto bg-[#f5f5f7]">
      <div className="max-w-xl mx-auto py-8 px-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">翻译设置</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-3">翻译服务</label>
            <div className="space-y-2">
              {([
                { id: 'mymemory' as const, label: '内置翻译 (MyMemory)', desc: '免费，无需配置，开箱即用，每日限额约1000词' },
                { id: 'deepl' as const, label: 'DeepL', desc: '翻译质量最高，免费版每月50万字符' },
                { id: 'baidu' as const, label: '百度翻译', desc: '国内访问稳定，标准版免费无限量' },
                { id: 'youdao' as const, label: '有道翻译', desc: '国内访问稳定，免费版每月1000次调用' },
              ]).map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors bg-white ${
                    form.provider === opt.id
                      ? 'border-blue-400 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={opt.id}
                    checked={form.provider === opt.id}
                    onChange={() => setForm({ ...form, provider: opt.id })}
                    className="mt-0.5 accent-blue-500"
                  />
                  <div>
                    <div className="text-sm text-gray-800">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {form.provider === 'deepl' && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">DeepL API Key</label>
              <input
                type="password"
                value={form.deeplApiKey}
                onChange={(e) => setForm({ ...form, deeplApiKey: e.target.value })}
                placeholder="输入你的 DeepL API Key"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                注册地址: <span className="text-blue-500">https://www.deepl.com/pro#developer</span>
              </p>
            </div>
          )}

          {form.provider === 'baidu' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">百度翻译 App ID</label>
                <input
                  type="text"
                  value={form.baiduAppId}
                  onChange={(e) => setForm({ ...form, baiduAppId: e.target.value })}
                  placeholder="输入百度翻译 App ID"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">百度翻译 Secret Key</label>
                <input
                  type="password"
                  value={form.baiduSecretKey}
                  onChange={(e) => setForm({ ...form, baiduSecretKey: e.target.value })}
                  placeholder="输入百度翻译 Secret Key"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400">
                注册地址: <span className="text-blue-500">https://fanyi-api.baidu.com/</span>
              </p>
            </div>
          )}

          {form.provider === 'youdao' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">有道翻译应用ID</label>
                <input
                  type="text"
                  value={form.youdaoAppId}
                  onChange={(e) => setForm({ ...form, youdaoAppId: e.target.value })}
                  placeholder="输入有道翻译应用ID (App Key)"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">有道翻译应用密钥</label>
                <input
                  type="password"
                  value={form.youdaoAppSecret}
                  onChange={(e) => setForm({ ...form, youdaoAppSecret: e.target.value })}
                  placeholder="输入有道翻译应用密钥 (App Secret)"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400">
                注册地址: <span className="text-blue-500">https://ai.youdao.com/</span>
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-md transition-colors"
          >
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

        <div className="mt-10 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">如何注册 API Key？</h3>
          <div className="space-y-4 text-xs text-gray-500 leading-relaxed">
            <div>
              <p className="text-gray-700 font-medium mb-1">DeepL (推荐)</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>打开 https://www.deepl.com/pro#developer</li>
                <li>点击 "免费试用 DeepL API"</li>
                <li>注册账号并登录</li>
                <li>在账户页面找到 "Authentication Key"</li>
                <li>复制 Key 粘贴到上方输入框</li>
                <li>免费版 Key 以 :fx 结尾，每月50万字符</li>
              </ol>
            </div>
            <div>
              <p className="text-gray-700 font-medium mb-1">百度翻译</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>打开 https://fanyi-api.baidu.com/</li>
                <li>注册百度账号并登录</li>
                <li>进入 "管理控制台" 创建应用</li>
                <li>选择 "通用翻译API" → "标准版"（免费）</li>
                <li>获取 App ID 和 Secret Key 填入上方</li>
              </ol>
            </div>
            <div>
              <p className="text-gray-700 font-medium mb-1">有道翻译</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>打开 https://ai.youdao.com/</li>
                <li>注册有道智云账号并登录</li>
                <li>进入 "控制台" → "应用管理" 创建应用</li>
                <li>添加 "自然语言翻译服务"，选择 "文本翻译"</li>
                <li>绑定应用后获取应用ID和应用密钥</li>
                <li>免费版每月1000次调用</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { TranslationSettings } from '../types';
import { FloppyDisk, Moon, Sun } from '@phosphor-icons/react';

interface SettingsPanelProps {
  settings: TranslationSettings;
  onSave: (settings: TranslationSettings) => void;
  onExport: () => void;
  onImport: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function SettingsPanel({ settings, onSave, onExport, onImport, darkMode, onToggleDark }: SettingsPanelProps) {
  const [form, setForm] = useState<TranslationSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="h-[calc(100vh-52px)] overflow-y-auto bg-[#f8f8fa] dark:bg-[#0f1117]">
      <div className="max-w-xl mx-auto py-8 px-6">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-6">翻译设置</h2>

        <div className="space-y-6">
          {/* Dark mode toggle */}
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-3">外观</label>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="flex items-center gap-2">
                {darkMode ? <Moon size={16} weight="fill" className="text-teal-500" /> : <Sun size={16} weight="fill" className="text-amber-500" />}
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{darkMode ? '深色模式' : '浅色模式'}</span>
              </div>
              <button
                onClick={onToggleDark}
                className={`relative w-10 h-5.5 rounded-full transition-all duration-200 active:scale-[0.95] ${
                  darkMode ? 'bg-teal-600' : 'bg-zinc-300'
                }`}
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    darkMode ? 'translate-x-[18px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-3">翻译服务</label>
            <div className="space-y-2">
              {([
                { id: 'mymemory' as const, label: '内置翻译 (MyMemory)', desc: '免费，无需配置，开箱即用，每日限额约1000词' },
                { id: 'deepl' as const, label: 'DeepL', desc: '翻译质量最高，免费版每月50万字符' },
                { id: 'baidu' as const, label: '百度翻译', desc: '国内访问稳定，标准版免费无限量' },
                { id: 'youdao' as const, label: '有道翻译', desc: '国内访问稳定，免费版每月1000次调用' },
              ]).map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 bg-white dark:bg-zinc-900 ${
                    form.provider === opt.id
                      ? 'border-teal-400 dark:border-teal-500 ring-2 ring-teal-100 dark:ring-teal-900/50'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={opt.id}
                    checked={form.provider === opt.id}
                    onChange={() => setForm({ ...form, provider: opt.id })}
                    className="mt-0.5 accent-teal-500"
                  />
                  <div>
                    <div className="text-sm text-zinc-800 dark:text-zinc-200">{opt.label}</div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {form.provider === 'deepl' && (
            <div>
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2">DeepL API Key</label>
              <input
                type="password"
                value={form.deeplApiKey}
                onChange={(e) => setForm({ ...form, deeplApiKey: e.target.value })}
                placeholder="输入你的 DeepL API Key"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
                注册地址: <span className="text-teal-500 dark:text-teal-400">https://www.deepl.com/pro#developer</span>
              </p>
            </div>
          )}

          {form.provider === 'baidu' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2">百度翻译 App ID</label>
                <input
                  type="text"
                  value={form.baiduAppId}
                  onChange={(e) => setForm({ ...form, baiduAppId: e.target.value })}
                  placeholder="输入百度翻译 App ID"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2">百度翻译 Secret Key</label>
                <input
                  type="password"
                  value={form.baiduSecretKey}
                  onChange={(e) => setForm({ ...form, baiduSecretKey: e.target.value })}
                  placeholder="输入百度翻译 Secret Key"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
                />
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                注册地址: <span className="text-teal-500 dark:text-teal-400">https://fanyi-api.baidu.com/</span>
              </p>
            </div>
          )}

          {form.provider === 'youdao' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2">有道翻译应用ID</label>
                <input
                  type="text"
                  value={form.youdaoAppId}
                  onChange={(e) => setForm({ ...form, youdaoAppId: e.target.value })}
                  placeholder="输入有道翻译应用ID (App Key)"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2">有道翻译应用密钥</label>
                <input
                  type="password"
                  value={form.youdaoAppSecret}
                  onChange={(e) => setForm({ ...form, youdaoAppSecret: e.target.value })}
                  placeholder="输入有道翻译应用密钥 (App Secret)"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 outline-none focus:border-teal-400 dark:focus:border-teal-500 transition-colors"
                />
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                注册地址: <span className="text-teal-500 dark:text-teal-400">https://ai.youdao.com/</span>
              </p>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 dark:bg-teal-700 dark:hover:bg-teal-600 text-white text-sm rounded-md transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-1.5"
          >
            <FloppyDisk size={15} weight="bold" />
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-4">数据管理</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">导出你的笔记、单词本和设置到 JSON 文件，可在其他设备导入恢复。文档文件需重新上传。</p>
            <div className="flex gap-2">
              <button
                onClick={onExport}
                className="flex-1 py-2 text-sm bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-md transition-all duration-200 active:scale-[0.97]"
              >
                导出数据
              </button>
              <button
                onClick={onImport}
                className="flex-1 py-2 text-sm bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-md transition-all duration-200 active:scale-[0.97]"
              >
                导入数据
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">如何注册 API Key？</h3>
          <div className="space-y-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <div>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">DeepL (推荐)</p>
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
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">百度翻译</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>打开 https://fanyi-api.baidu.com/</li>
                <li>注册百度账号并登录</li>
                <li>进入 "管理控制台" 创建应用</li>
                <li>选择 "通用翻译API" → "标准版"（免费）</li>
                <li>获取 App ID 和 Secret Key 填入上方</li>
              </ol>
            </div>
            <div>
              <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-1">有道翻译</p>
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

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
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-6">设置</h2>

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
                { id: 'mymemory' as const, label: '内置翻译 (MyMemory)', desc: '免费，无需配置，开箱即用，每日限额约5000词' },
                { id: 'youdao_web' as const, label: '有道翻译 (网页版)', desc: '免费无限额，自动打开有道翻译网页并复制原文，翻译后粘贴结果即可' },
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">导出你的笔记、单词本到 JSON 文件，可在其他设备导入恢复。文档文件需重新上传。</p>
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
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { BookBookmark, Book, Gear } from '@phosphor-icons/react';

interface LayoutProps {
  activeTab: 'reading' | 'vocabulary' | 'settings';
  onTabChange: (tab: 'reading' | 'vocabulary' | 'settings') => void;
  children: ReactNode;
}

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const tabs = [
    { id: 'reading' as const, label: '阅读笔记', icon: BookBookmark },
    { id: 'vocabulary' as const, label: '单词本', icon: Book },
    { id: 'settings' as const, label: '设置', icon: Gear },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#f8f8fa] dark:bg-[#0f1117]">
      <nav className="flex items-center h-[52px] border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 shrink-0 shadow-sm">
        <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mr-8 tracking-tight">
          小睿快读
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-1.5 rounded-md text-sm transition-all duration-200 active:scale-[0.97] flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-teal-600 text-white dark:bg-teal-600 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon size={15} weight={activeTab === tab.id ? 'fill' : 'regular'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

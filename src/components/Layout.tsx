import { ReactNode } from 'react';

interface LayoutProps {
  activeTab: 'reading' | 'vocabulary' | 'settings';
  onTabChange: (tab: 'reading' | 'vocabulary' | 'settings') => void;
  children: ReactNode;
}

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const tabs = [
    { id: 'reading' as const, label: '阅读笔记' },
    { id: 'vocabulary' as const, label: '单词本' },
    { id: 'settings' as const, label: '设置' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f7]">
      <nav className="flex items-center h-[52px] border-b border-gray-200 bg-white px-4 shrink-0 shadow-sm">
        <div className="text-lg font-semibold text-gray-800 mr-8 tracking-tight">
          ReadAssist
        </div>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

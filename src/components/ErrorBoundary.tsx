import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-zinc-950">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">页面渲染出错，可能是浏览器翻译功能干扰了文档显示</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

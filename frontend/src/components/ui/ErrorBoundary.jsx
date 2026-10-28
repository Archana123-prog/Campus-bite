import React from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Pet Pooja ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/15 text-brand-600 dark:text-brand-400">
            <AlertTriangle size={32} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-black text-ink-900 dark:text-white">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-md text-sm text-ink-500 dark:text-ink-300">
            We encountered a temporary hiccup loading this section. Tap below to reload smoothly.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReload}
              className="btn-primary !px-5 !py-2.5 text-sm font-bold shadow-md shadow-brand-500/25 flex items-center gap-2"
            >
              <RefreshCw size={16} /> Reload Page
            </button>
            <button
              onClick={this.handleGoHome}
              className="btn-ghost !px-5 !py-2.5 text-sm font-bold border border-ink-200 dark:border-ink-700 flex items-center gap-2"
            >
              <Home size={16} /> Back to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


// #region agent log (only when VITE_ERROR_INGEST_URL is set)
const ERROR_INGEST_URL = (import.meta.env.VITE_ERROR_INGEST_URL || '').trim();
(() => {
  if (!ERROR_INGEST_URL) return;
  const origOnError = window.onerror;
  window.onerror = function (msg, url, line, col, err) {
    if (typeof msg === 'string' && msg.includes('Cannot convert object to primitive value')) {
      try {
        fetch(ERROR_INGEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'global:window.onerror',
            message: 'TypeError: Cannot convert object to primitive value',
            data: { msg, url, line, col, stack: err?.stack },
            timestamp: Date.now(),
            hypothesisId: 'H1-global'
          })
        }).catch(() => {});
      } catch (_) {}
    }
    return origOnError ? (origOnError as any)(msg, url, line, col, err) : false;
  };
})();
// #endregion

import React, { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css'; // Import styles and fonts

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error in application:", error, errorInfo);
    // #region agent log
    if (ERROR_INGEST_URL && error?.message?.includes?.('Cannot convert object to primitive value')) {
      try {
        fetch(ERROR_INGEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'ErrorBoundary.componentDidCatch',
            message: 'TypeError: Cannot convert object to primitive value',
            data: { error: String(error), stack: error?.stack, componentStack: errorInfo?.componentStack },
            timestamp: Date.now(),
            hypothesisId: 'H2-error-boundary'
          })
        }).catch(() => {});
      } catch (_) {}
    }
    // #endregion
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', direction: 'rtl', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
          <div style={{ padding: '40px', background: 'white', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth: '500px' }}>
            <h1 style={{ color: '#800020', marginBottom: '16px', fontSize: '24px', fontWeight: 'bold' }}>متاسفانه خطایی رخ داده است</h1>
            <p style={{ marginBottom: '24px', color: '#4b5563', lineHeight: '1.6' }}>احتمالاً به دلیل بروزرسانی سیستم یا کش قدیمی مرورگر، مشکلی در اجرای برنامه به وجود آمده است.</p>
            
            <div style={{ 
              marginBottom: '24px', 
              padding: '12px', 
              background: '#fee2e2', 
              color: '#991b1b',
              borderRadius: '12px', 
              textAlign: 'left', 
              direction: 'ltr',
              overflow: 'auto',
              maxHeight: '150px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}>
              {this.state.error?.toString()}
            </div>

            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{
                padding: '14px 32px',
                backgroundColor: '#800020',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                transition: 'all 0.2s',
                boxShadow: '0 10px 15px -3px rgba(128,0,32,0.3)'
              }}
            >
              پاکسازی حافظه و تلاش مجدد
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children || null;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

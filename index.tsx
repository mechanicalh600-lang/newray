import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: Readonly<ErrorBoundaryProps> & Readonly<{ children?: ReactNode }>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', direction: 'rtl', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ color: '#800020', marginBottom: '10px' }}>متاسفانه خطایی رخ داده است</h1>
          <p style={{marginBottom: '20px'}}>اگر صفحه سفید مانده است، احتمالا نسخه قدیمی در حافظه مرورگر مانده است.</p>
          
          <div style={{ 
            marginBottom: '20px', 
            padding: '10px', 
            background: '#f3f4f6', 
            borderRadius: '8px', 
            textAlign: 'left', 
            direction: 'ltr',
            overflow: 'auto',
            maxHeight: '200px',
            fontSize: '12px',
            maxWidth: '100%',
            width: '400px'
          }}>
            {this.state.error?.toString()}
          </div>

          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#800020',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            پاکسازی کش و بارگذاری مجدد
          </button>
        </div>
      );
    }

    return this.props.children || null;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
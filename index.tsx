import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './components/AppWrapper';
import './src/index.css';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Simple Error Boundary to catch crashes (e.g. Import map failures or Rendering errors)
class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props: Readonly<ErrorBoundaryProps>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
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
        <div style={{
          backgroundColor: '#0D0C1D', 
          color: '#FF00FF', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: 'monospace',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{fontSize: '48px', marginBottom: '20px'}}>SYSTEM CRASH</h1>
          <div style={{border: '4px solid #FF00FF', padding: '20px', maxWidth: '800px', backgroundColor: '#000'}}>
            <p style={{color: '#FFF'}}>CRITICAL_FAILURE_DETECTED</p>
            <p style={{color: 'red', marginTop: '20px'}}>{this.state.error?.toString()}</p>
            <p style={{marginTop: '20px', color: '#00FFFF'}}>Please refresh the page or check the console.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AppWrapper />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
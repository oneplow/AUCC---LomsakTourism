﻿'use client';
import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-6">
              <AlertTriangle size={32} className="text-accent" />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: 'var(--color-content)' }}>
              เกิดข้อผิดพลาดบางอย่าง
            </h1>
            <p className="text-content-secondary leading-7 mb-8">
              ขออภัย เกิดปัญหาขณะแสดงหน้านี้ กรุณาลองใหม่อีกครั้ง หากปัญหายังคงเกิดขึ้น ลองรีเฟรชหน้าเว็บ
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-8 text-left">
                <summary className="cursor-pointer text-sm font-medium mb-2" style={{ color: 'var(--color-danger)' }}>
                  รายละเอียด Error (โหมด Development)
                </summary>
                <pre className="text-xs p-4 rounded-lg overflow-auto max-h-40" style={{ 
                  background: 'var(--color-surface-alt)', 
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-content-secondary)'
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="nature-button"
              >
                <RefreshCw size={18} />
                ลองอีกครั้ง
              </button>
              <a href="/" className="nature-button-secondary">
                <Home size={18} />
                กลับหน้าแรก
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

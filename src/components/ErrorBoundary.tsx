import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let message = "Ocorreu um erro inesperado.";
      let details = "";

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            message = "Erro de permissão ou conexão com o banco de dados.";
            details = parsed.error;
          }
        }
      } catch (e) {
        // Not a JSON error
        message = this.state.error?.message || message;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <div className="bg-rose-100 p-4 rounded-2xl inline-block mb-4">
              <AlertCircle className="text-rose-600 size-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Ops! Algo deu errado</h2>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            {details && (
              <div className="bg-slate-50 p-3 rounded-xl mb-6 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-slate-400 break-all">{details}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              <RefreshCcw size={18} />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

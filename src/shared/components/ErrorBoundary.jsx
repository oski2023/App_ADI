import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-bg-main p-6 text-center animate-fade-in">
                    <div className="max-w-md w-full bg-bg-card rounded-3xl shadow-premium border border-border p-10 space-y-6">
                        <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-text-primary">Oops! Algo salió mal</h1>
                        <p className="text-text-secondary">
                            La aplicación encontró un error inesperado. No te preocupes, tus datos están a salvo.
                        </p>
                        <div className="bg-bg-hover rounded-xl p-4 text-left overflow-auto max-h-40">
                            <code className="text-xs text-error font-mono">
                                {this.state.error?.toString()}
                            </code>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl transition-all active:scale-95 shadow-lg shadow-primary/20"
                        >
                            Recargar Aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

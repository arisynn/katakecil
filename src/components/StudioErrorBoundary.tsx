import React from 'react';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { navigate } from '../utils/nav';

type State = { failed: boolean };
export default class StudioErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Only technical details go to the developer console, never expose private manuscripts.
    console.error('Studio rendering error:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="studio-failure" role="alert">
      <div className="studio-failure-card">
        <AlertTriangle size={32} aria-hidden="true" />
        <h1>Halaman Studio belum bisa dibuka.</h1>
        <p>Ada kendala saat menampilkan bagian ini. Draft dan jadwal tersimpan di database, bukan di halaman yang gagal ditampilkan.</p>
        <div className="studio-failure-actions">
          <button type="button" onClick={() => window.location.reload()}><RotateCcw size={17}/> Coba lagi</button>
          <button type="button" onClick={() => navigate('/studio')}><ArrowLeft size={17}/> Beranda Studio</button>
        </div>
      </div>
    </div>;
  }
}

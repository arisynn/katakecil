import React from 'react';

type Props = React.PropsWithChildren<{onBack:()=>void}>;
type State = {crashed:boolean};

/** Show a recoverable, non-sensitive error screen instead of an empty browser page. */
export default class ReaderErrorBoundary extends React.Component<Props,State> {
 state:State={crashed:false};
 static getDerivedStateFromError():State { return {crashed:true}; }
 componentDidCatch(error:Error,info:React.ErrorInfo){
  // Avoid logging text content or private manuscript data.
  console.error('Reader rendering failed:',error.name,info.componentStack);
 }
 render(){
  if(!this.state.crashed)return this.props.children;
  return <main className="reader-recovery" role="alert">
   <section className="reader-recovery-card">
    <h1>Halaman membaca belum bisa ditampilkan.</h1>
    <p>Terjadi kendala saat menata halaman. Ceritamu tetap aman tersimpan.</p>
    <div className="reader-recovery-actions">
     <button type="button" onClick={()=>window.location.reload()}>Coba lagi</button>
     <button type="button" onClick={this.props.onBack}>Kembali ke cerita</button>
    </div>
   </section>
  </main>;
 }
}

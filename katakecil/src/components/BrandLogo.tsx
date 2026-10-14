/** Full vector wordmark (feather + lettering). No font substitution between public and Studio. */
export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`kk-v7-brand kk-v72-wordmark${compact ? ' kk-v7-brand--compact' : ''}`}
    role="img" aria-label="KataKecil">
    <img className="kk-v72-wordmark-light" src="/brand/katakecil-wordmark-light.svg" width="259" height="36" alt="" aria-hidden="true"/>
    <img className="kk-v72-wordmark-dark" src="/brand/katakecil-wordmark-dark.svg" width="259" height="36" alt="" aria-hidden="true"/>
  </span>;
}

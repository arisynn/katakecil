import React from 'react';
/** Shared brand lockup: the feather is a vector asset, never an icon font. */
export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`kk-v7-brand${compact ? ' kk-v7-brand--compact' : ''}`}>
    <img src="/brand/katakecil-mark.svg" width="30" height="30" alt="" aria-hidden="true" />
    <span>KataKecil</span>
  </span>;
}

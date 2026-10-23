/** A compact crystal book and a typographic wordmark shared by Library/Studio. */
export default function BrandLogo({compact=false}:{compact?:boolean}){
 return <span className={`crystal-brand${compact?' crystal-brand--compact':''}`} role="img" aria-label="KataKecil"><img src="/brand/crystal-mark.png" width="40" height="44" alt="" aria-hidden="true"/><span className="crystal-brand-text">Kata<span>Kecil</span></span></span>;
}

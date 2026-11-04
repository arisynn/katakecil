declare module 'dom-anchor-text-quote' {
  interface Quote { exact: string; prefix: string; suffix: string }
  export function fromTextPosition(root: {textContent: string}, selector: {start: number; end: number}): Quote;
  export function toTextPosition(root: {textContent: string}, selector: Quote, options?: {hint?: number}): {start: number; end: number} | null;
}

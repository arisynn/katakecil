/** Public boundary of the generated shared service; its TypeScript source is checked by npm run lint. */
export interface ContentConfig {
  url: string;
  publicKey: string;
  secretKey: string;
  origin: string;
}
export function readEpubConfig(env: Record<string, string | undefined>): ContentConfig | null;
export function contentRequest(request: Request, config: ContentConfig | null, repository?: unknown): Promise<Response>;

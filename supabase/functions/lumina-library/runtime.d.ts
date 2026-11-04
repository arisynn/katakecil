// Minimal runtime surface for checking this dependency-free Edge Function in the workspace.
declare const Deno: {
 env: {get(name: string): string | undefined};
 serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};

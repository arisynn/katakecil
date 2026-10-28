import { contentRequest, readEpubConfig } from "../server/content/service.ts";
export const GET = (request: Request) => contentRequest(request, readEpubConfig());
export const OPTIONS = GET;

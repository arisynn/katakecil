import DOMPurify from "dompurify";
import { marked } from "marked";
import { epubReaderContent } from "../epub/readerContent";
import { normalizedTitle } from "./model";
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (
    node.nodeName === "IMG" &&
    !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(node.getAttribute("src") || "")
  )
    node.removeAttribute("src");
});
export function readerDocument(html: string, markdown: string, title: string) {
  const clean = DOMPurify.sanitize(html || (marked.parse(markdown, { async: false }) as string), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["iframe", "style", "script", "form", "input", "button", "video", "audio", "svg", "math"],
    FORBID_ATTR: ["style", "srcset"],
    ADD_ATTR: ["data-epub-href"],
  });
  const parsed = epubReaderContent(clean);
  const first = parsed.blocks[0];
  if (first?.kind === "heading" && normalizedTitle(first.text) === normalizedTitle(title)) {
    parsed.blocks.shift();
    const delta = first.text.length + 2;
    parsed.anchors = Object.fromEntries(
      Object.entries(parsed.anchors).map(([key, offset]) => [key, Math.max(0, offset - delta)]),
    );
    parsed.content = parsed.blocks.map((b) => b.text).join("\n\n");
  }
  return parsed;
}

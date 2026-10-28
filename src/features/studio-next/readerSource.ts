import { supabase } from "../../data/supabase";
import type { ReaderSource } from "../../data/readerSource";
import { readerDocument } from "./readerDocument";
import { cleanLeadingTitle, type ContentItem, type ContentDocument } from "./model";
import { previewDocument } from "./api";
export async function isStudioBook(id: string) {
  if (!supabase) return false;
  const { data, error } = await supabase.from("qr_studio_books").select("book_id").eq("book_id", id).maybeSingle();
  if (error) {
    if (["PGRST205", "42P01"].includes(error.code)) return false;
    throw Error("Format buku belum dapat diperiksa.");
  }
  return Boolean(data);
}
export function createStudioReaderSource(bookId: string): ReaderSource {
  let rows: any[] = [];
  return {
    async loadIndex() {
      if (!supabase) throw Error("Pembaca belum terhubung.");
      rows = [];
      for (let start = 0; start < 10000; start += 200) {
        const { data, error } = await supabase
          .from("qr_studio_releases")
          .select("id,reader_number,title,arc_title,kind,display_number,release_at,position")
          .eq("book_id", bookId)
          .eq("is_enabled", true)
          .lte("release_at", new Date().toISOString())
          .order("position")
          .order("id")
          .range(start, start + 199);
        if (error) throw Error("Daftar isi belum dapat dimuat.");
        rows.push(...(data ?? []));
        if ((data?.length ?? 0) < 200) break;
      }
      return rows.map((r) => ({
        episode_number: r.reader_number,
        title: r.title,
        arc_title: r.arc_title,
        release_at: r.release_at,
        kind: r.kind,
        display_number: r.display_number,
        position: r.position,
      }));
    },
    async loadEpisode(number, signal) {
      const row = rows.find((r) => r.reader_number === number);
      if (!row) throw Error("Bagian belum terbit.");
      if (!supabase) throw Error("Pembaca belum terhubung.");
      const { data, error, response } = await supabase.functions.invoke("book-content", {
        body: { id: row.id },
        signal,
      });
      if (error)
        throw Error(
          response?.status === 404
            ? "Bagian belum terbit atau sudah ditarik."
            : "Layanan baca belum dapat dimuat. Coba lagi.",
        );
      if (
        !data ||
        typeof data.title !== "string" ||
        typeof data.markdown !== "string" ||
        typeof data.html !== "string" ||
        data.html.length > 4_500_000 ||
        data.markdown.length > 1_000_000
      )
        throw Error("Respons bacaan tidak valid.");
      const parsed = readerDocument(data.html, data.markdown, data.title);
      return {
        episodeNumber: number,
        title: data.title,
        arc: row.arc_title,
        ...parsed,
        kind: data.kind,
        displayNumber: data.displayNumber,
        sourceVersion: data.sourceVersion,
      };
    },
  };
}
export function previewSource(item: ContentDocument, number = 1): ReaderSource {
  return {
    preview: true,
    loadIndex: async () => [
      {
        episode_number: number,
        title: item.title,
        arc_title: item.arc_title,
        release_at: "",
        kind: item.kind,
        display_number: item.display_number,
      },
    ],
    loadEpisode: async () => {
      const value = await previewDocument(item),
        parsed = readerDocument(value.html, value.markdown, item.title);
      return {
        episodeNumber: number,
        title: item.title,
        arc: item.arc_title,
        ...parsed,
        kind: item.kind,
        displayNumber: item.display_number,
      };
    },
  };
}

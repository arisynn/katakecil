import { lazy, Suspense, useMemo } from "react";
import type { ContentDocument } from "./model";
import { previewSource } from "./readerSource";
import { useReaderDialogFocus } from "../../hooks/useReaderDialogFocus";
const Reader = lazy(() => import("../../SecureReaderApp"));
export default function ReaderPreview({
  document,
  bookTitle,
  onClose,
}: {
  document: ContentDocument;
  bookTitle: string;
  onClose: () => void;
}) {
  const source = useMemo(() => previewSource(document), [document]);
  const ref = useReaderDialogFocus<HTMLDivElement>(onClose);
  return (
    <div ref={ref} className="ws-reader-preview" role="dialog" aria-modal="true" aria-label="Pratinjau pembaca">
      <button className="ws-preview-close" type="button" onClick={onClose}>
        Tutup pratinjau
      </button>
      <Suspense fallback={<p>Menyiapkan pratinjau…</p>}>
        <Reader bookId="studio-preview" bookTitle={bookTitle} source={source} onExit={onClose} />
      </Suspense>
    </div>
  );
}

import { useEffect, useState } from "react";
import { classifyCover, defaultFocus, shelfNeedsFill, type CoverMeasure } from "@/lib/cover-fit";

export function SmartCover({
  src,
  title,
  surface,
  known,
}: {
  src: string;
  title: string;
  surface: "shelf" | "detail" | "thumb";
  known?: CoverMeasure | null;
}) {
  const [measure, setMeasure] = useState<CoverMeasure | null>(known ?? null);
  useEffect(() => {
    setMeasure(known ?? null);
  }, [known, src]);

  const kind = measure?.kind ?? "book";
  const fill = surface !== "detail" && measure ? shelfNeedsFill(measure.ratio) : false;
  const focus = measure ? defaultFocus(measure.kind) : { x: 0.5, y: 0.5 };
  const detailRatio = measure && kind !== "poster" ? `${measure.width} / ${measure.height}` : undefined;

  return (
    <div
      className={`frame frame-${surface} ${fill ? "frame-fill-yes" : "frame-fill-no"}`}
      data-kind={kind}
      style={surface === "detail" && detailRatio ? { aspectRatio: detailRatio } : undefined}
    >
      {fill && <img src={src} alt="" aria-hidden="true" className="frame-backdrop" />}
      <img
        src={src}
        alt={surface === "detail" ? `Sampul ${title}` : ""}
        className="frame-image"
        style={{ objectPosition: `${focus.x * 100}% ${focus.y * 100}%` }}
        onLoad={(event) => {
          if (known) return;
          const img = event.currentTarget;
          setMeasure(classifyCover(img.naturalWidth, img.naturalHeight));
        }}
      />
    </div>
  );
}

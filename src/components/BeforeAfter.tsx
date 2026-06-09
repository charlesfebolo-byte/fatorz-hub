import type { CSSProperties } from "react";
import { useState } from "react";

type BeforeAfterProps = {
  before: string;
  after: string;
  beforeAlt?: string;
  afterAlt?: string;
  beforeLabel?: string;
  afterLabel?: string;
};

export default function BeforeAfter({
  before,
  after,
  beforeAlt = "Antes",
  afterAlt = "Depois",
  beforeLabel = "Antes",
  afterLabel = "Depois",
}: BeforeAfterProps) {
  const [position, setPosition] = useState(50);

  const style = {
    "--fz-ba-position": `${position}%`,
  } as CSSProperties;

  return (
    <div className="fz-before-after" style={style}>
      <img className="fz-ba-img fz-ba-before" src={before} alt={beforeAlt} />

      <img className="fz-ba-img fz-ba-after" src={after} alt={afterAlt} />

      <span className="fz-ba-label fz-ba-label-before">{beforeLabel}</span>
      <span className="fz-ba-label fz-ba-label-after">{afterLabel}</span>

      <div className="fz-ba-divider" />
      <div className="fz-ba-handle" />

      <input
        className="fz-ba-range"
        type="range"
        min="0"
        max="100"
        value={position}
        aria-label="Comparar antes e depois"
        onChange={(event) => setPosition(Number(event.target.value))}
      />
    </div>
  );
}
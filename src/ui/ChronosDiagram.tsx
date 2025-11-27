import React, { useMemo } from "react";
import { generateSVG } from "../viz/SVGGenerator.js";

export type ChronosDiagramProps = {
  graph: any; // VizGraph
  width?: number;
  height?: number;
  className?: string;
};

export default function ChronosDiagram({ graph, width=1000, height=600, className }: ChronosDiagramProps) {
  const svg = useMemo(() => generateSVG(graph, { width, height }), [graph, width, height]);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

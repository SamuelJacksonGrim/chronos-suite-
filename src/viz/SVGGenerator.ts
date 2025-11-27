/* SVG System Diagram Generator
   - No external deps
   - Exports: generateSVG, toDataUrl
*/
import { escapeXml, uid, approxTextWidth, centerRect } from './utils.js';

export type VizNode = {
  id: string;
  label?: string;
  w?: number; // optional explicit width
  h?: number; // optional explicit height
};

export type VizEdge = {
  id?: string;
  from: string;
  to: string;
  label?: string;
  meta?: any;
};

export type VizGraph = {
  nodes: VizNode[];
  edges: VizEdge[];
  roots?: string[]; // optional root nodes (start points)
};

export type GeneratorOptions = {
  nodePadding?: number; // padding inside node rect
  nodeVGap?: number; // vertical gap between layers
  nodeHGap?: number; // horizontal gap between nodes
  width?: number;
  height?: number;
  fontSize?: number;
  background?: string;
  arrowColor?: string;
  nodeFill?: string;
  nodeStroke?: string;
  edgeLabelMaxLength?: number;
};

const DEFAULTS: GeneratorOptions = {
  nodePadding: 10,
  nodeVGap: 80,
  nodeHGap: 36,
  width: 1200,
  height: 800,
  fontSize: 12,
  background: '#0f172a', // tailwind gray-900
  arrowColor: '#60a5fa', // blue-400
  nodeFill: '#0b1220', // darker box
  nodeStroke: '#1f2937',
  edgeLabelMaxLength: 32,
};

// --- small synth helpers for event-name generation (used when edge.label absent)
function synthNameFromMeta(meta: any) {
  try {
    if (!meta) return 'event:auto';
    if (typeof meta === 'string') return meta.slice(0, 48);
    if (meta.name) return String(meta.name).slice(0, 48);
    if (meta.type) return `event:${meta.type}`.slice(0, 48);
    // payload summary heuristics
    if (meta.payload) {
      if (typeof meta.payload === 'string') return meta.payload.slice(0, 48);
      if (meta.payload.type) return `event:${meta.payload.type}`.slice(0, 48);
    }
    return 'event:auto';
  } catch { return 'event:auto'; }
}

// --- layout: simple layered layout
function buildAdjacency(graph: VizGraph) {
  const nodesById = new Map(graph.nodes.map(n => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const n of graph.nodes) { outgoing.set(n.id, []); incoming.set(n.id, []); }
  for (const e of graph.edges) {
    if (!nodesById.has(e.from) || !nodesById.has(e.to)) continue;
    outgoing.get(e.from)!.push(e.to);
    incoming.get(e.to)!.push(e.from);
  }
  return { nodesById, outgoing, incoming };
}

// assign layers (breadth-first from roots) — fallback: nodes without incoming are roots
function assignLayers(graph: VizGraph) {
  const { nodesById, outgoing, incoming } = buildAdjacency(graph);
  const layers = new Map<string, number>();
  const queue: string[] = [];

  const roots = (graph.roots && graph.roots.length) ? graph.roots :
    graph.nodes.filter(n => (incoming.get(n.id) || []).length === 0).map(n => n.id);

  // initialize
  for (const r of roots) {
    layers.set(r, 0);
    queue.push(r);
  }

  // BFS assign layers
  while (queue.length) {
    const cur = queue.shift()!;
    const curLayer = layers.get(cur)!;
    for (const to of outgoing.get(cur) || []) {
      const prev = layers.get(to);
      const candidate = curLayer + 1;
      if (prev == null || candidate > prev) {
        layers.set(to, candidate);
        queue.push(to);
      }
    }
  }

  // any nodes not reached: put them at the end (maxLayer+1)
  let maxLayer = 0;
  for (const l of layers.values()) if (l > maxLayer) maxLayer = l;
  for (const n of graph.nodes) {
    if (!layers.has(n.id)) {
      maxLayer += 1;
      layers.set(n.id, maxLayer);
    }
  }

  // build map layer -> nodes
  const grouped = new Map<number, string[]>();
  for (const [id, layer] of layers.entries()) {
    if (!grouped.has(layer)) grouped.set(layer, []);
    grouped.get(layer)!.push(id);
  }

  // order nodes in layer by out-degree (descending) to help packing
  for (const [layer, ids] of grouped) {
    ids.sort((a, b) => (outgoing.get(b)?.length || 0) - (outgoing.get(a)?.length || 0));
    grouped.set(layer, ids);
  }

  return { layers, grouped, maxLayer };
}

// compute final positions (x,y) for node centers
function computePositions(graph: VizGraph, options: GeneratorOptions) {
  const opts = { ...DEFAULTS, ...(options || {}) };
  const { grouped, maxLayer } = assignLayers(graph);

  // compute widths/heights
  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
  const nodeSizes = new Map<string, { w: number; h: number }>();

  for (const n of graph.nodes) {
    const label = n.label ?? n.id;
    const w = (n.w ?? approxTextWidth(label, Math.max(6, Math.round(opts.fontSize! * 0.6)))) + opts.nodePadding! * 2;
    const h = n.h ?? Math.max(28, Math.round(opts.fontSize! * 2.5));
    nodeSizes.set(n.id, { w, h });
  }

  // total width: spread columns across width
  // we compute max nodes per layer, then allocate column positions per layer
  let maxCount = 0;
  for (const ids of grouped.values()) if (ids.length > maxCount) maxCount = ids.length;

  const canvasW = opts.width!;
  const canvasH = opts.height!;
  const leftPadding = 40;
  const topPadding = 40;

  const layerCount = maxLayer + 1;
  const layerHeight = (canvasH - topPadding * 2) / Math.max(1, layerCount - 1);

  const positions = new Map<string, { x: number; y: number }>();

  // place nodes per layer
  for (let layer = 0; layer <= maxLayer; layer++) {
    const ids = grouped.get(layer) || [];
    const count = ids.length || 1;
    const layerY = topPadding + layer * layerHeight;

    // compute total width of nodes in this row
    const totalNodeWidth = ids.reduce((acc, id) => acc + nodeSizes.get(id)!.w, 0);
    const totalGaps = opts.nodeHGap! * Math.max(0, count - 1);
    const usableW = Math.min(canvasW - leftPadding * 2, totalNodeWidth + totalGaps);
    // start x such that row centered
    let startX = (canvasW - usableW) / 2 + (nodeSizes.get(ids[0])!.w / 2 || 0);

    // But to avoid nodes squishing on wide rows with few nodes,
    // distribute based on available width evenly
    const spacing = (canvasW - leftPadding * 2) / Math.max(1, count);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      // center nodes evenly using spacing
      const x = leftPadding + spacing * i + spacing / 2;
      positions.set(id, { x, y: layerY });
    }
  }

  return { positions, nodeSizes, canvasW, canvasH };
}

// build path between two centers: cubic bezier with control points offset to layer distance
function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  // if same x, draw straight-ish path
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  const curvature = Math.min(0.6, Math.max(0.2, dx / (dx + dy + 1)));
  const cx1 = from.x + (to.x - from.x) * curvature;
  const cy1 = from.y + dy * 0.25;
  const cx2 = to.x - (to.x - from.x) * curvature;
  const cy2 = to.y - dy * 0.25;
  return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
}

// helper to truncate label
function truncLabel(label: string | undefined, maxLen: number) {
  if (!label) return '';
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 3) + '...';
}

// --- main export
export function generateSVG(graph: VizGraph, options?: GeneratorOptions) {
  const opts = { ...DEFAULTS, ...(options || {}) };
  // ensure edges have ids and labels
  let eid = 0;
  for (const e of graph.edges) {
    if (!e.id) e.id = `e-${++eid}-${uid('')}`;
    if (!e.label) e.label = truncLabel(synthNameFromMeta(e.meta), opts.edgeLabelMaxLength!);
  }

  const { positions, nodeSizes, canvasW, canvasH } = computePositions(graph, opts);

  const svgId = uid('svg');

  // defs
  const defs = `
    <defs>
      <marker id="arrow-${svgId}" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="${escapeXml(opts.arrowColor!)}" />
      </marker>
      <style>
        .node-text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace; font-size: ${opts.fontSize}px; fill: #e6eef8; }
        .edge-text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace; font-size: ${Math.max(10, opts.fontSize! - 1)}px; fill: #bae6fd; }
      </style>
    </defs>
  `;

  // background
  const bg = `<rect width="${canvasW}" height="${canvasH}" fill="${escapeXml(opts.background!)}"/>`;

  // nodes
  const nodeElems: string[] = [];
  for (const n of graph.nodes) {
    const pos = positions.get(n.id)!;
    const size = nodeSizes.get(n.id)!;
    const rect = centerRect(pos.x, pos.y, size.w, size.h);
    const rectId = `node-${escapeXml(n.id)}`;
    nodeElems.push(`
      <g id="${rectId}" transform="translate(${rect.left},${rect.top})">
        <rect rx="8" ry="8" width="${size.w}" height="${size.h}" fill="${escapeXml(opts.nodeFill!)}" stroke="${escapeXml(opts.nodeStroke!)}" stroke-width="1.2"></rect>
        <text class="node-text" x="${size.w/2}" y="${size.h/2}" dominant-baseline="middle" text-anchor="middle">${escapeXml(n.label ?? n.id)}</text>
      </g>
    `);
  }

  // edges
  const edgeElems: string[] = [];
  for (const e of graph.edges) {
    const fromPos = positions.get(e.from);
    const toPos = positions.get(e.to);
    if (!fromPos || !toPos) continue;
    const pathD = edgePath(fromPos, toPos);
    const pathId = `path-${e.id}`;
    // label placement via textPath if supported
    const labelEsc = escapeXml(e.label || '');
    edgeElems.push(`
      <g class="edge" aria-label="${labelEsc}">
        <path id="${pathId}" d="${pathD}" fill="none" stroke="${escapeXml(opts.arrowColor!)}" stroke-width="1.4" marker-end="url(#arrow-${svgId})" opacity="0.9" />
        <text class="edge-text">
          <textPath href="#${pathId}" startOffset="50%" text-anchor="middle">${labelEsc}</textPath>
        </text>
      </g>
    `);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" role="img" aria-label="System diagram">
    ${defs}
    ${bg}
    <g class="edges">${edgeElems.join('\n')}</g>
    <g class="nodes">${nodeElems.join('\n')}</g>
  </svg>`;

  return svg;
}

// converts svg string to data URL
export function toDataUrl(svg: string) {
  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

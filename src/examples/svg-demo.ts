// Example: build a small graph, generate SVG, print data URL
import { generateSVG, toDataUrl } from '../viz/SVGGenerator.js';

// Example graph
const graph = {
  nodes: [
    { id: 'init', label: 'UNINITIALIZED' },
    { id: 'pres', label: 'PRESENTATION' },
    { id: 'aff', label: 'AFFIRMATION' },
    { id: 'sig', label: 'SIGNATURE' },
    { id: 'live', label: 'LIVE' },
  ],
  edges: [
    { from: 'init', to: 'pres', label: 'present' },
    { from: 'pres', to: 'aff', label: 'acknowledge' },
    { from: 'aff', to: 'sig', label: 'confirm' },
    { from: 'sig', to: 'live', label: 'sign' },
    { from: 'pres', to: 'live', label: 'skip' },
  ]
};

async function main() {
  const svg = generateSVG(graph as any, { width: 1000, height: 600 });
  console.log('SVG LENGTH', svg.length);

  // Output file-friendly suggestion for Node: write to file
  // But here we just show a data URL
  const dataUrl = toDataUrl(svg);
  console.log('DATA URL (starts):', dataUrl.slice(0, 128));

  // If running in Node, you can write the svg to disk:
  // import { writeFileSync } from 'fs';
  // writeFileSync('diagram.svg', svg, 'utf8');
}

main().catch(console.error);

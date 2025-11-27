#!/usr/bin/env node
import { writeFileSync } from "fs";
import { generateSVG } from "../viz/SVGGenerator.js";

const graph = {
  nodes: [
    { id: 'UNINIT', label: 'UNINITIALIZED' },
    { id: 'PRES', label: 'PRESENTATION' },
    { id: 'AFF', label: 'AFFIRMATION' },
    { id: 'SIG', label: 'SIGNATURE' },
    { id: 'LIVE', label: 'LIVE' }
  ],
  edges: [
    { from: 'UNINIT', to: 'PRES', label: 'init' },
    { from: 'PRES', to: 'AFF', label: 'ack' },
    { from: 'AFF', to: 'SIG', label: 'sign' },
    { from: 'SIG', to: 'LIVE', label: 'activate' }
  ]
};

const svg = generateSVG(graph as any, { width: 1200, height: 720 });
writeFileSync('chronos-diagram.svg', svg, 'utf8');
console.log('Wrote chronos-diagram.svg');

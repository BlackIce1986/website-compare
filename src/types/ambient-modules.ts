// Ambient module declarations to satisfy TypeScript in editor diagnostics
// Minimal types; we can refine later if needed.

declare module 'pixelmatch' {
  const pixelmatch: any;
  export default pixelmatch;
}

declare module 'pngjs' {
  export const PNG: any;
}
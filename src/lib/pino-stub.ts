// Stub for Node.js modules when bundled for the browser by Turbopack.
// These modules are only used server-side; client bundles get this no-op.

class AsyncLocalStorage {
  getStore() { return undefined; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(_store: any, fn: () => any) { return fn(); }
}

export { AsyncLocalStorage };
export default {};

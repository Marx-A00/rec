import { Writable } from 'stream';

/**
 * Creates a writable stream that batches log entries and sends them to Axiom
 * via HTTP. Runs on the main thread — no worker threads needed (Turbopack safe).
 *
 * Logs are buffered and flushed every 1 second or when the batch reaches 100 entries.
 */
export function createAxiomStream(
  dataset: string,
  token: string
): Writable | null {
  if (!dataset || !token) return null;

  const buffer: Record<string, unknown>[] = [];
  const FLUSH_INTERVAL = 1000; // 1 second
  const BATCH_SIZE = 100;

  async function flush() {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0);

    try {
      const res = await fetch(
        `https://api.axiom.co/v1/datasets/${encodeURIComponent(dataset)}/ingest`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batch),
        }
      );
      if (!res.ok) {
        // Log to stderr so it doesn't re-enter pino
        process.stderr.write(
          `[axiom-stream] Failed to send logs: ${res.status} ${res.statusText}\n`
        );
      }
    } catch (err) {
      process.stderr.write(
        `[axiom-stream] Error sending logs: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  }

  // Periodic flush
  const interval = setInterval(flush, FLUSH_INTERVAL);
  interval.unref(); // Don't keep the process alive

  // Flush on exit
  process.on('beforeExit', () => flush());

  return new Writable({
    objectMode: false,
    write(chunk: Buffer, _encoding, callback) {
      try {
        const line = chunk.toString().trim();
        if (line) {
          const parsed = JSON.parse(line);
          buffer.push(parsed);
          if (buffer.length >= BATCH_SIZE) {
            flush();
          }
        }
      } catch {
        // Skip unparseable lines
      }
      callback();
    },
  });
}

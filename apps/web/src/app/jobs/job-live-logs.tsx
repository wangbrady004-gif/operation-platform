'use client';

import { toast } from '@/lib/toast';
import { useEffect, useRef, useState } from 'react';

export function JobLiveLogs({ jobId }: { jobId: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const preRef = useRef<HTMLPreElement>(null);
  const streamWarnedRef = useRef(false);

  useEffect(() => {
    streamWarnedRef.current = false;
    const es = new EventSource(`/api/jobs/${jobId}/logs/stream`);

    es.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string) as {
          type?: string;
          lines?: string[];
          state?: string;
          exitCode?: number | null;
        };
        if (d.type === 'log' && Array.isArray(d.lines)) {
          const incoming = d.lines as string[];
          setLines((prev) => [...prev, ...incoming].slice(-2000));
        }
        if (d.type === 'done') {
          toast.info('Live stream ended', {
            id: `job-logs-done-${jobId}`,
            description:
              d.state != null
                ? `Session ${d.state}${d.exitCode != null ? ` (exit ${d.exitCode})` : ''}`
                : undefined,
          });
          es.close();
        }
      } catch {
        /* ignore parse */
      }
    };

    es.onerror = () => {
      if (!streamWarnedRef.current) {
        streamWarnedRef.current = true;
        toast.warning('Live logs disconnected', {
          id: `job-logs-stream-${jobId}`,
          description: 'Refresh the page to reconnect.',
        });
      }
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  useEffect(() => {
    const el = preRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-900/50 bg-zinc-950 p-3">
      <p className="mb-2 text-xs font-medium text-emerald-500">Live stream</p>
      <pre
        ref={preRef}
        className="max-h-[40vh] overflow-auto font-mono text-xs text-emerald-100"
      >
        {lines.length ? lines.join('\n') : 'Listening…'}
      </pre>
    </div>
  );
}

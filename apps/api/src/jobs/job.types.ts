export type JobState =
  /** Legacy rows only — same meaning as starting (see migration `006-consolidate-job-state-to-starting.sql`). */
  | 'queued'
  /** Waiting for a worker to attach (UI: «Waiting»). */
  | 'starting'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

/** Worker + UI: PayTM generic runner extras (no secrets — merchant secrets come from DB snapshot). */
export interface PaytmJobPayload {
  kind: 'paytm';
  mode: 'txn' | 'name';
  profile: string;
  /**
   * When `deferAnchors` is true, operator submits these later on the job page while the bot waits.
   * Otherwise required at enqueue time.
   */
  lastTransactionId?: string;
  lastCustomerName?: string;
  /** When true, bot opens PayTM first; ops pastes anchors on the job page; worker polls internal API. */
  deferAnchors?: boolean;
  /** When set, worker fetches decrypted snapshot from internal API and passes --config-file. */
  merchantId?: string;
  /**
   * Vendored thin script under `tp_127_executabes/` (same entrypoint as PyCharm on `b_auto`).
   */
  thinScriptRelativePath: string;
}

/** Worker + UI: Google Pay runner extras. */
export interface GoogleJobPayload {
  kind: 'google';
  /** Merchant profile key — passed as --profile to run_google_bot.py */
  profile: string;
  /** Last UTR seen on the Google Pay transactions page — bot stops here and processes newer ones. */
  lastUtr: string;
  /** Worker fetches decrypted snapshot from internal API and passes --config-file. */
  merchantId: string;
}

export type JobPayload = PaytmJobPayload | GoogleJobPayload;

export interface JobRecord {
  id: string;
  scriptRelativePath: string;
  payload: JobPayload | null;
  state: JobState;
  /** Present while state is running and operator asked to stop (worker should kill the bot). */
  cancellationRequestedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
  logs: string[];
  paytmAnchorInput: {
    lastTransactionId: string;
    lastCustomerName?: string;
  } | null;
}

export interface JobSummary {
  id: string;
  scriptRelativePath: string;
  payload: JobPayload | null;
  state: JobState;
  /** While running and operator requested stop (same field as full JobRecord). */
  cancellationRequestedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
  logLineCount: number;
}

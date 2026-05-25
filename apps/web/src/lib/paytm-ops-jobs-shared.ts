/** Matches Nest PAYTM_WRAPPER_SCRIPT; copy templates/b_auto_tp_127_executabes/run_paytm_bot.py into b_auto. */
export const PAYTM_SCRIPT = 'tp_127_executabes/run_paytm_bot.py';
/** Matches Nest GOOGLE_WRAPPER_SCRIPT; run_google_bot.py in tp_127_executabes/. */
export const GOOGLE_SCRIPT = 'tp_127_executabes/run_google_bot.py';

export type EnqueueResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export type AnchorSubmitResult =
  | { ok: true }
  | { ok: false; message: string };

export type LoginAssistOk = {
  profileKey: string;
  mobileNumber: string;
  password: string;
  executableRelativePath: string | null;
  anchorMode: 'txn' | 'name';
};

export type LoginAssistResult =
  | { ok: true; data: LoginAssistOk }
  | { ok: false; message: string };

// Ambient global declaration for the Google Identity Services script loaded at runtime.
// @types/google-one-tap uses `export as namespace google` (UMD pattern) which only
// makes `google` available as a global in non-module (script) files. This file re-declares
// the global so module files (any file with `import` statements) can also access
// `google.accounts.id` without a TS2686 error.
//
// Shape is kept in sync with @types/google-one-tap@1.2.7.

interface GoogleOneTapIdConfiguration {
  client_id: string;
  auto_select?: boolean;
  callback?: (response: { credential: string }) => void;
  login_uri?: string;
  cancel_on_tap_outside?: boolean;
  prompt_parent_id?: string;
  nonce?: string;
  context?: "signin" | "signup" | "use";
  ux_mode?: "popup" | "redirect";
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

declare const google: {
  accounts: {
    id: {
      initialize: (config: GoogleOneTapIdConfiguration) => void;
      prompt: (listener?: (notification: unknown) => void) => void;
      disableAutoSelect: () => void;
      cancel: () => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

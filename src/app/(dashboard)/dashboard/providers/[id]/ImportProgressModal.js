"use client";

import { Modal } from "@/shared/components";

export default function ImportProgressModal({
  isOpen,
  onClose,
  progress,
}) {
  const {
    phase,
    status = "",
    logs = [],
    error = "",
    importedCount = 0,
  } = progress || {};

  const showCloseButton = phase === "done" || phase === "error";
  const indeterminate = phase === "fetching" || phase === "importing";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Models"
      size="md"
      closeOnOverlay={false}
      showTrafficLights={false}
      showCloseButton={showCloseButton}
    >
      <div className="flex flex-col gap-4">
        {/* Status text */}
        <div className="flex items-center gap-3">
          {indeterminate && (
            <span className="material-symbols-outlined text-primary animate-spin">
              progress_activity
            </span>
          )}
          {phase === "done" && (
            <span className="material-symbols-outlined text-green-500">
              check_circle
            </span>
          )}
          {phase === "error" && (
            <span className="material-symbols-outlined text-red-500">error</span>
          )}
          <span className="text-sm font-medium text-text-main">{status}</span>
        </div>

        {/* Indeterminate bar while fetching/importing (single bulk request) */}
        {indeterminate && (
          <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                width: "60%",
                background:
                  "linear-gradient(90deg, var(--color-primary), var(--color-primary-hover, var(--color-primary)))",
              }}
            />
          </div>
        )}

        {/* Full bar on done */}
        {phase === "done" && (
          <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: "100%",
                background: "linear-gradient(90deg, #22c55e, #16a34a)",
              }}
            />
          </div>
        )}

        {/* Error message */}
        {phase === "error" && error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Log list */}
        {logs.length > 0 && (
          <div className="max-h-48 overflow-y-auto rounded-lg bg-black/5 dark:bg-white/5 p-3 border border-black/5 dark:border-white/5">
            <div className="flex flex-col gap-1">
              {logs.map((log, i) => (
                <p
                  key={i}
                  className={`text-xs font-mono ${
                    typeof log === "string" && log.startsWith("✓")
                      ? "text-green-500 font-semibold"
                      : "text-text-muted"
                  }`}
                >
                  {log}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        {showCloseButton && (
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
            >
              {"Close"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
import React, { useEffect } from "react";

export default function ConfirmModal({
  open,
  title = "",
  message = "",
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  confirmDisabled = false,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const showCancel = typeof onCancel === "function" && cancelText != null && cancelText !== "";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Confirmation"}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-[#990100]">
          <h2 className="text-white text-sm font-semibold tracking-wide">
            {title || "Confirmation"}
          </h2>
        </div>

        <div className="px-4 sm:px-5 py-4">
          <p className="text-sm text-gray-800 whitespace-pre-line">{message}</p>

          <div className="mt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            {showCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`px-5 py-2 rounded-full text-sm text-white transition cursor-pointer ${
                confirmDisabled
                  ? "bg-[#ad3332]/60 cursor-not-allowed"
                  : "bg-[#990100] hover:bg-[#ad3332]"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

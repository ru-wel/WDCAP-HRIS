import React, { useEffect } from "react";

export default function ConfirmModal({
  open,
  title = "",
  message = "",
  content = null,
  variant = null,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  confirmDisabled = false,
  confirmLoading = false,
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

  const containerClass = variant === 'form' ? 'w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden' : 'w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden';
  const contentClass = variant === 'form' ? 'px-6 py-5' : 'px-4 sm:px-5 pt-3 pb-4';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Confirmation"}
    >
      <div className={containerClass}>
        <div className="px-3 sm:px-4 py-3 bg-[#990100] m-4 rounded-lg">
          <h2 className="text-white text-sm font-semibold tracking-wide">{title || "Confirmation"}</h2>
        </div>

        <div className={contentClass}>
          {content ? (
            <div className="text-sm px-2 text-gray-800">{content}</div>
          ) : (
            <p className="text-sm text-gray-800 px-2 whitespace-pre-line">{message}</p>
          )}

          {variant === 'form' ? (
            <div className="mt-6 flex items-center justify-end gap-4">
              {showCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={confirmLoading}
                  className="px-5 py-2 rounded-lg text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmDisabled || confirmLoading}
                className={`px-6 py-2 rounded-lg text-sm text-white transition cursor-pointer inline-flex items-center gap-2 ${
                  confirmDisabled || confirmLoading ? 'bg-[#ad3332]/60 cursor-not-allowed' : 'bg-[#990100] hover:bg-[#ad3332]'
                }`}
              >
                {confirmLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {confirmLoading ? 'Processing...' : confirmText}
              </button>
            </div>
          ) : (
            <div className="mt-8 flex items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              {showCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={confirmLoading}
                  className="px-4 py-2 rounded-lg text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirmDisabled || confirmLoading}
                className={`px-5 py-2 rounded-lg text-sm text-white transition cursor-pointer inline-flex items-center gap-2 ${
                  confirmDisabled || confirmLoading
                    ? "bg-[#ad3332]/60 cursor-not-allowed"
                    : "bg-[#990100] hover:bg-[#ad3332]"
                }`}
              >
                {confirmLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                {confirmLoading ? 'Processing...' : confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

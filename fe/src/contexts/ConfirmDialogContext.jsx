import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialogContext } from './useConfirmDialog';
import styles from './ConfirmDialogContext.module.css';

export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const confirmButtonRef = useRef(null);

  const closeDialog = useCallback((confirmed) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options) => {
    resolverRef.current?.(false);

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: 'Xác nhận thao tác',
        message: '',
        confirmLabel: 'Xác nhận',
        cancelLabel: 'Hủy',
        tone: 'primary',
        ...options,
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    confirmButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeDialog(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog, closeDialog]);

  useEffect(() => () => resolverRef.current?.(false), []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}

      {dialog && (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog(false);
          }}
        >
          <section
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
          >
            <div className={`${styles.symbol} ${styles[dialog.tone]}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16.5" r="1" fill="currentColor" />
                <path d="M10.3 3.8 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.8a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </div>

            <div className={styles.copy}>
              <h2 id="confirm-dialog-title">{dialog.title}</h2>
              <p id="confirm-dialog-message">{dialog.message}</p>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={() => closeDialog(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className={`${styles.confirmButton} ${styles[dialog.tone]}`}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

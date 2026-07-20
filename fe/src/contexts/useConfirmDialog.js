import { createContext, useContext } from 'react';

export const ConfirmDialogContext = createContext(null);

export function useConfirmDialog() {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) throw new Error('useConfirmDialog must be used inside ConfirmDialogProvider');
  return confirm;
}

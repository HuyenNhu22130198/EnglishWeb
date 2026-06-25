const FLASHCARD_STORAGE_PREFIX = 'english-web-user-flashcards-v1';
const FLASHCARD_NEXT_ID_PREFIX = 'english-web-user-flashcard-next-id-v1';

const normalizeOwnerValue = (value) => String(value).trim().toLowerCase();

export const getFlashcardOwnerKey = (user) => {
  const owner = [user?.id, user?.userId, user?.username, user?.email].find(
    (value) => value !== undefined && value !== null && String(value).trim()
  );

  return owner ? normalizeOwnerValue(owner) : '';
};

export const getFlashcardStorageKey = (user) => {
  const ownerKey = getFlashcardOwnerKey(user);
  return ownerKey ? `${FLASHCARD_STORAGE_PREFIX}:${ownerKey}` : '';
};

export const getFlashcardNextIdKey = (user) => {
  const ownerKey = getFlashcardOwnerKey(user);
  return ownerKey ? `${FLASHCARD_NEXT_ID_PREFIX}:${ownerKey}` : '';
};

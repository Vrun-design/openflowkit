import { readLocalStorageString } from '@/services/storage/uiLocalStorage';

export const WELCOME_SEEN_STORAGE_KEY = 'hasSeenWelcome_v1';

export function shouldShowWelcomeModal(): boolean {
    return !readLocalStorageString(WELCOME_SEEN_STORAGE_KEY);
}

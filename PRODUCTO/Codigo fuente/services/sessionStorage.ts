import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

function isWebStorageAvailable() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage;
}

export async function setSessionItem(key: string, value: string): Promise<void> {
  if (isWebStorageAvailable()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function getSessionItem(key: string): Promise<string | null> {
  if (isWebStorageAvailable()) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function deleteSessionItem(key: string): Promise<void> {
  if (isWebStorageAvailable()) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

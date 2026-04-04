import { Platform } from 'react-native';

export const isWeb = (): boolean => Platform.OS === 'web';
export const isNative = (): boolean => Platform.OS !== 'web';
export const isIOS = (): boolean => Platform.OS === 'ios';
export const isAndroid = (): boolean => Platform.OS === 'android';

/**
 * Returns true if WebAssembly is available.
 * False on Expo Go (iOS/Android) and some older browsers.
 */
export const isWasmSupported = (): boolean => {
  try {
    return typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
  } catch {
    return false;
  }
};

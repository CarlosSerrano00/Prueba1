import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

// Firebase's React Native export is selected by Metro, while TypeScript reads the web barrel.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}

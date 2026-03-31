import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'borkd-storage',
  encryptionKey: 'borkd-enc-key', // TODO: Use a proper key from secure store
});

// GPS buffer storage
export const gpsStorage = new MMKV({
  id: 'borkd-gps-buffer',
});

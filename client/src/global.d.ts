// src/global.d.ts

interface Navigator {
  webkitTemporaryStorage: {
    queryUsageAndQuota: (
      callback: (usedBytes: number, grantedBytes: number) => void
    ) => void;
    requestQuota: (
      newBytes: number,
      successCallback: (grantedBytes: number) => void,
      errorCallback: (error: Error) => void
    ) => void;
  };
  webkitPersistentStorage: {
    queryUsageAndQuota: (
      callback: (usedBytes: number, grantedBytes: number) => void
    ) => void;
    requestQuota: (
      newBytes: number,
      successCallback: (grantedBytes: number) => void,
      errorCallback: (error: Error) => void
    ) => void;
  };
}

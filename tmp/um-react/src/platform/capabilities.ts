/** Batch download modes a platform may expose via `capabilities.downloadTypes`. */
export enum BatchDownloadType {
  /** Existing File System Access directory picker. */
  SelectDirectory = 'SelectDirectory',
  /** Existing streaming ZIP via `showSaveFilePicker`. */
  StreamZip = 'StreamZip',
  /** Existing in-memory ZIP blob download. */
  PackZip = 'PackZip',
}

/** Android-side key import path (single value on capabilities). */
export enum AndroidImportType {
  None = 'none',
  Adb = 'adb',
}

/** One-click native client import targets (settings checkboxes). */
export enum NativeImportType {
  QQMusic = 'qqmusic',
  Kuwo = 'kuwo',
  Kugou = 'kugou',
  QingTing = 'qtfm',
}

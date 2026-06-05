"use client";

import { useState } from "react";

/** Owns the Local Storage section state: the raw-message-content toggle. */
export function useStorageSection(initialStoreRaw: boolean) {
  const [storeRaw, setStoreRaw] = useState(initialStoreRaw);

  return { storeRaw, setStoreRaw };
}

export type StorageSectionController = ReturnType<typeof useStorageSection>;

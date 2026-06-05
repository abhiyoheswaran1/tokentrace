"use client";

import { useState } from "react";

/** Owns the Custom Folders section state: the folder list and add-folder draft. */
export function useFoldersSection(initialFolders: string[]) {
  const [customFolders, setCustomFolders] = useState(initialFolders);
  const [newFolder, setNewFolder] = useState("");

  function addFolder() {
    const folder = newFolder.trim();
    if (!folder) return;
    if (!customFolders.includes(folder)) setCustomFolders((current) => [...current, folder]);
    setNewFolder("");
  }

  function removeFolder(folder: string) {
    setCustomFolders((current) => current.filter((item) => item !== folder));
  }

  return { customFolders, newFolder, setNewFolder, addFolder, removeFolder };
}

export type FoldersSectionController = ReturnType<typeof useFoldersSection>;

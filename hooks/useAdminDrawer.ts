"use client";

import { useState } from "react";

export interface AdminDrawerState<T> {
  open: boolean;
  data: T | null;
  openWith: (d: T) => void;
  openNew: () => void;
  close: () => void;
  setOpen: (v: boolean) => void;
}

export function useAdminDrawer<T = null>(): AdminDrawerState<T> {
  const [open, setOpenRaw] = useState(false);
  const [data, setData]    = useState<T | null>(null);

  function openWith(d: T) {
    setData(d);
    setOpenRaw(true);
  }

  function openNew() {
    setData(null);
    setOpenRaw(true);
  }

  function close() {
    setOpenRaw(false);
    // Clear data after animation completes
    setTimeout(() => setData(null), 250);
  }

  function setOpen(v: boolean) {
    if (!v) close();
    else setOpenRaw(true);
  }

  return { open, data, openWith, openNew, close, setOpen };
}

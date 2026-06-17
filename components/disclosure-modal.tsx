"use client";

import React, { useState } from "react";
import { Disclosure } from "@/prototype/fixtures";
import { Icon } from "./icons";

/** Disclosure gate before a Confidential doc renders (DESIGN_BRIEF §5.4). */
export function DisclosureModal({
  disclosure,
  onAck,
  onCancel,
}: {
  disclosure: Disclosure;
  onAck: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal className="w-full max-w-lg rounded-2xl border bg-[var(--color-elevated)] p-6">
        <div className="mb-2 flex items-center gap-2">
          <Icon name="lock" size={16} />
          <h2 className="font-display text-lg font-semibold">{disclosure.title}</h2>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--color-muted)]">{disclosure.body}</p>
        <label className="mb-5 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />
          <span>I acknowledge the terms above. I understand this access is logged.</span>
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border px-4 py-2 text-sm hover:bg-[var(--color-panel)]">
            Cancel
          </button>
          <button
            disabled={!checked}
            onClick={onAck}
            className="rounded-xl bg-[var(--color-amber)] px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            Open document
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LedgerMutation } from "@/lib/finance/ledger-types";

export function useLedgerSave() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(mutation: LedgerMutation, onSaved?: () => void, onFailure?: () => void) {
    if (saving.current) return false;
    saving.current = true; setPending(true);
    setError(""); setMessage("Saving…");
      try {
        const response = await fetch("/api/ledger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mutation) });
        if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "The change could not be saved."); }
        setMessage("Saved to the household ledger."); onSaved?.();
        startTransition(() => router.refresh());
        return true;
      } catch (failure) { setMessage(""); setError(failure instanceof Error ? failure.message : "The change could not be saved."); onFailure?.(); return false;
      } finally { saving.current = false; setPending(false); }
  }
  return { save, pending, message, error };
}

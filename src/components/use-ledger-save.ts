"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LedgerMutation } from "@/lib/finance/ledger-types";

export function useLedgerSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function save(mutation: LedgerMutation, onSaved?: () => void) {
    setError(""); setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/ledger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mutation) });
        if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "The change could not be saved."); }
        router.refresh(); setMessage("Saved to the household ledger."); onSaved?.();
      } catch (failure) { setError(failure instanceof Error ? failure.message : "The change could not be saved."); }
    });
  }
  return { save, pending, message, error };
}

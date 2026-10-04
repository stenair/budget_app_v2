"use client";
import { createContext, useContext } from "react";
import { categories, type HouseholdNames } from "@/lib/finance/ledger-types";
import type { Person } from "@/lib/finance/types";

const defaults = { names: { stefan: "Stefan", partner: "Partner" }, categoryNames: categories };
const HouseholdContext = createContext(defaults);
export function HouseholdProvider({ names, categoryNames, children }: { names: HouseholdNames; categoryNames: string[]; children: React.ReactNode }) {
  return <HouseholdContext.Provider value={{ names, categoryNames }}>{children}</HouseholdContext.Provider>;
}
export function useHousehold() {
  const value = useContext(HouseholdContext);
  return { ...value, personLabel: (person: Person | string) => person === "Stefan" ? value.names.stefan : person === "Partner" ? value.names.partner : person };
}

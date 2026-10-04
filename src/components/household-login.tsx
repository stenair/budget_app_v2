import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HouseholdLogin({ message, signIn = false, canSignOut = false }: { message: string; signIn?: boolean; canSignOut?: boolean }) {
  return <main className="grid min-h-screen place-items-center p-6"><div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground"><Landmark className="size-6" /></span><h1 className="mt-5 text-2xl font-semibold">Your private Harbour</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>{signIn ? <div className="mt-5 flex justify-center gap-3"><Button asChild><Link href="/sign-in">Sign in</Link></Button><Button asChild variant="outline"><Link href="/sign-up">Create account</Link></Button></div> : null}{canSignOut ? <SignOutButton><Button variant="outline" className="mt-5">Use another account</Button></SignOutButton> : null}</div></main>;
}

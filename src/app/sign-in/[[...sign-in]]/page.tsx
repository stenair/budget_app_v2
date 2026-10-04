import { SignIn } from "@clerk/nextjs";
import { authConfigured } from "@/lib/finance/access";
import { HouseholdLogin } from "@/components/household-login";

export default function SignInPage() {
  if (!authConfigured()) return <HouseholdLogin message="Household login is ready to configure. Add your Clerk keys and household email allowlist on the server." />;
  return <main className="grid min-h-screen place-items-center p-6"><SignIn routing="path" path="/sign-in" forceRedirectUrl="/" /></main>;
}

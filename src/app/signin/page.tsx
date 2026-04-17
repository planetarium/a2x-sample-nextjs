import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl ?? "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in to a2x-sample
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Continue with your Google account to access the dashboard.
        </p>
        <SignInButton callbackUrl={callbackUrl ?? "/"} />
      </div>
    </div>
  );
}

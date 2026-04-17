import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/SignOutButton";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-zinc-50 via-white to-zinc-50 font-sans dark:from-zinc-950 dark:via-black dark:to-zinc-950">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          a2x-sample-nextjs
        </div>
        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                {user.image && (
                  <Image
                    src={user.image}
                    alt={user.name ?? "avatar"}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                )}
                <span className="font-medium">{user.name}</span>
              </div>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/signin"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          a2x sample on Next.js 16
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          A minimal, production-grade starter with Google OAuth, RFC 8628 Device
          Code Flow, and the a2x agent protocol — ready to deploy on Fly.io.
        </p>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <Feature
            title="Auth.js v5"
            body="Google Web Application OAuth with JWT sessions and PKCE."
          />
          <Feature
            title="Device Code"
            body="RFC 8628 Device Authorization Grant built on Google auth."
          />
          <Feature
            title="a2x protocol"
            body="Exposes an A2A endpoint via @a2x/sdk."
          />
        </div>

        {!user && (
          <Link
            href="/signin"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get started
          </Link>
        )}
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-center text-xs text-zinc-500 dark:text-zinc-600">
        planetarium / a2x-sample-nextjs
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}

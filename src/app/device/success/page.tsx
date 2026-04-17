import Link from "next/link";

export default function DeviceSuccessPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-600 dark:text-emerald-400"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Device connected
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          You can return to your device now — it will continue automatically.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

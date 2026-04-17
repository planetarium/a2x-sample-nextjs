import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import {
  getByUserCode,
  isExpired,
  normalizeUserCode,
} from "@/lib/device-code-store";

export const dynamic = "force-dynamic";

const DEVICE_COOKIE = "a2x_device_user_code";

async function submit(formData: FormData) {
  "use server";
  const raw = String(formData.get("user_code") ?? "");
  const userCode = normalizeUserCode(raw);
  if (!userCode) {
    redirect(`/device?error=${encodeURIComponent("invalid_code")}`);
  }

  const record = getByUserCode(userCode);
  if (!record) {
    redirect(`/device?error=${encodeURIComponent("not_found")}&user_code=${encodeURIComponent(userCode)}`);
  }
  if (record.status === "expired" || isExpired(record)) {
    redirect(`/device?error=${encodeURIComponent("expired")}&user_code=${encodeURIComponent(userCode)}`);
  }
  if (record.status === "denied") {
    redirect(`/device?error=${encodeURIComponent("denied")}&user_code=${encodeURIComponent(userCode)}`);
  }
  if (record.status === "approved") {
    redirect(`/device/success`);
  }

  const jar = await cookies();
  jar.set(DEVICE_COOKIE, userCode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  const session = await auth();
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/device/approve")}`);
  }
  redirect("/device/approve");
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: "That code doesn't look right. Double-check and try again.",
  not_found: "We can't find that code. It may have already been used.",
  expired: "That code has expired. Please start a new request.",
  denied: "That request was denied.",
};

export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const prefill = sp.user_code ? normalizeUserCode(sp.user_code) : "";
  const message = sp.error ? ERROR_MESSAGES[sp.error] ?? "Something went wrong." : null;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Connect a device
        </h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Enter the code displayed on your device to authorize it.
        </p>

        {message && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {message}
          </div>
        )}

        <form action={submit} className="space-y-5">
          <label
            htmlFor="user_code"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Device code
          </label>
          <input
            id="user_code"
            name="user_code"
            defaultValue={prefill}
            autoComplete="off"
            autoFocus
            spellCheck={false}
            placeholder="XXXX-XXXX"
            inputMode="text"
            className="block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center font-mono text-lg uppercase tracking-[0.35em] text-zinc-900 shadow-sm outline-none ring-zinc-900/10 transition focus:border-zinc-900 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-100"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

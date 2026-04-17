import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import { auth } from "@/auth";
import {
  approveDeviceCode,
  denyDeviceCode,
  getByUserCode,
  isExpired,
} from "@/lib/device-code-store";
import { signDeviceToken, DEVICE_TOKEN_EXPIRES_IN_SEC } from "@/lib/device-token";

export const dynamic = "force-dynamic";

const DEVICE_COOKIE = "a2x_device_user_code";

async function approveAction() {
  "use server";
  const session = await auth();
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/device/approve")}`);
  }

  const jar = await cookies();
  const userCode = jar.get(DEVICE_COOKIE)?.value;
  if (!userCode) {
    redirect("/device");
  }

  const record = getByUserCode(userCode);
  if (!record) {
    redirect(`/device?error=not_found`);
  }
  if (record.status !== "pending") {
    jar.delete(DEVICE_COOKIE);
    if (record.status === "expired") redirect(`/device?error=expired`);
    if (record.status === "denied") redirect(`/device?error=denied`);
    redirect("/device/success");
  }

  const sub =
    (session.user as { id?: string; email?: string | null }).id ??
    session.user.email ??
    "unknown";
  const accessToken = await signDeviceToken({
    sub,
    email: session.user.email ?? undefined,
    scope: record.scopes.join(" "),
    client_id: record.clientId,
  });

  approveDeviceCode({
    userCode,
    userSub: sub,
    userEmail: session.user.email ?? undefined,
    accessToken,
    accessTokenExpiresInSec: DEVICE_TOKEN_EXPIRES_IN_SEC,
  });

  jar.delete(DEVICE_COOKIE);
  redirect("/device/success");
}

async function denyAction() {
  "use server";
  const jar = await cookies();
  const userCode = jar.get(DEVICE_COOKIE)?.value;
  if (userCode) {
    denyDeviceCode(userCode);
    jar.delete(DEVICE_COOKIE);
  }
  redirect("/device?error=denied");
}

export default async function DeviceApprovePage() {
  const session = await auth();
  if (!session?.user) {
    redirect(`/signin?callbackUrl=${encodeURIComponent("/device/approve")}`);
  }

  const jar = await cookies();
  const userCode = jar.get(DEVICE_COOKIE)?.value;
  if (!userCode) {
    redirect("/device");
  }

  const record = getByUserCode(userCode);
  if (!record) {
    redirect("/device?error=not_found");
  }
  if (record.status !== "pending" || isExpired(record)) {
    jar.delete(DEVICE_COOKIE);
    if (record.status === "approved") redirect("/device/success");
    redirect(
      `/device?error=${encodeURIComponent(record.status === "denied" ? "denied" : "expired")}`,
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Authorize this device?
        </h1>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          A device with client{" "}
          <span className="font-mono text-zinc-900 dark:text-zinc-100">
            {record.clientId}
          </span>{" "}
          is requesting access with the following scope:
        </p>
        <ul className="mb-8 space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {record.scopes.map((s) => (
            <li
              key={s}
              className="font-mono text-zinc-900 dark:text-zinc-100"
            >
              {s}
            </li>
          ))}
        </ul>

        <div className="mb-8 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "avatar"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {session.user.name ?? session.user.email}
            </span>
            {session.user.email && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {session.user.email}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <form action={denyAction} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-full border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Deny
            </button>
          </form>
          <form action={approveAction} className="flex-1">
            <button
              type="submit"
              className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              Allow
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-600">
          Code:{" "}
          <span className="font-mono tracking-widest">{record.userCode}</span>
        </p>
      </div>
    </div>
  );
}

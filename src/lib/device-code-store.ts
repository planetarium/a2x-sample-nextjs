import { randomBytes } from "node:crypto";

export type DeviceCodeStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired";

export interface DeviceCodeRecord {
  deviceCode: string;
  userCode: string;
  clientId: string;
  scopes: string[];
  status: DeviceCodeStatus;
  createdAt: number;
  expiresAt: number;
  interval: number;
  lastPolledAt?: number;
  userSub?: string;
  userEmail?: string;
  accessToken?: string;
  accessTokenExpiresAt?: number;
}

const DEFAULT_EXPIRES_IN = 600;
const DEFAULT_INTERVAL = 5;

const USER_CODE_ALPHABET = "BCDFGHJKLMNPQRSTVWXYZ";

function randomUserCode(): string {
  const buf = randomBytes(8);
  const chars: string[] = [];
  for (let i = 0; i < 8; i++) {
    chars.push(USER_CODE_ALPHABET[buf[i] % USER_CODE_ALPHABET.length]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

function randomDeviceCode(): string {
  return randomBytes(32).toString("base64url");
}

const GLOBAL_KEY = Symbol.for("a2x-sample.device-code-store");

type Globals = Record<
  symbol,
  | {
      byDevice: Map<string, DeviceCodeRecord>;
      byUser: Map<string, string>;
    }
  | undefined
>;

function getStore() {
  const g = globalThis as Globals;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      byDevice: new Map(),
      byUser: new Map(),
    };
  }
  return g[GLOBAL_KEY]!;
}

export interface CreateDeviceCodeInput {
  clientId: string;
  scopes: string[];
  expiresIn?: number;
  interval?: number;
}

export function createDeviceCode(
  input: CreateDeviceCodeInput,
): DeviceCodeRecord {
  const store = getStore();
  const now = Date.now();

  let userCode = randomUserCode();
  while (store.byUser.has(userCode)) {
    userCode = randomUserCode();
  }

  const record: DeviceCodeRecord = {
    deviceCode: randomDeviceCode(),
    userCode,
    clientId: input.clientId,
    scopes: input.scopes,
    status: "pending",
    createdAt: now,
    expiresAt: now + (input.expiresIn ?? DEFAULT_EXPIRES_IN) * 1000,
    interval: input.interval ?? DEFAULT_INTERVAL,
  };

  store.byDevice.set(record.deviceCode, record);
  store.byUser.set(record.userCode, record.deviceCode);
  return record;
}

export function getByDeviceCode(
  deviceCode: string,
): DeviceCodeRecord | undefined {
  return getStore().byDevice.get(deviceCode);
}

export function getByUserCode(userCode: string): DeviceCodeRecord | undefined {
  const deviceCode = getStore().byUser.get(userCode.toUpperCase());
  return deviceCode ? getStore().byDevice.get(deviceCode) : undefined;
}

export function normalizeUserCode(userCode: string): string {
  const cleaned = userCode.replace(/[^A-Za-z0-9-]/g, "").toUpperCase();
  if (/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(cleaned)) {
    return cleaned.includes("-") ? cleaned : `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return cleaned;
}

export function approveDeviceCode(params: {
  userCode: string;
  userSub: string;
  userEmail?: string;
  accessToken: string;
  accessTokenExpiresInSec: number;
}): DeviceCodeRecord | undefined {
  const record = getByUserCode(params.userCode);
  if (!record) return undefined;
  if (record.status !== "pending") return record;
  if (Date.now() > record.expiresAt) {
    record.status = "expired";
    return record;
  }
  record.status = "approved";
  record.userSub = params.userSub;
  record.userEmail = params.userEmail;
  record.accessToken = params.accessToken;
  record.accessTokenExpiresAt = Date.now() + params.accessTokenExpiresInSec * 1000;
  return record;
}

export function denyDeviceCode(userCode: string): DeviceCodeRecord | undefined {
  const record = getByUserCode(userCode);
  if (!record) return undefined;
  if (record.status === "pending") {
    record.status = "denied";
  }
  return record;
}

export function markPolled(deviceCode: string): DeviceCodeRecord | undefined {
  const record = getByDeviceCode(deviceCode);
  if (!record) return undefined;
  record.lastPolledAt = Date.now();
  return record;
}

export function isExpired(record: DeviceCodeRecord, now = Date.now()): boolean {
  return now > record.expiresAt;
}

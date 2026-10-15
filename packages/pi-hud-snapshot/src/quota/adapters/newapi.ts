/** Explicitly trusted NewAPI origin; Key quota, never an account wallet. */
import type { QuotaProfile } from "../../config.ts";
import type { QuotaHostAuth, QuotaHeadersLike, QuotaSnapshotData } from "../types.ts";
import { originOfBaseUrl } from "../identity.ts";
import { adapterIssue, bearerAuthorization, httpStatusIssue, isObject, parseJsonPayload } from "./http.ts";

export interface NewApiMetering {
  quotaPerUnit: number;
  displayType: "USD" | "CNY" | "QUOTA";
  usdExchangeRate?: number;
}
export interface NewApiKeyQuota {
  remaining: number;
  used: number;
  granted: number;
  unlimited: boolean;
  /** Epoch milliseconds; the verified usage endpoint returns seconds. */
  expiresAt: number | null;
  metering: NewApiMetering | null;
  meteringSource: "config" | "status" | "raw";
  remainingText: string;
  usedText: string;
  grantedText: string;
  currency: "USD" | "CNY" | "quota";
}

export function validNewApiMetering(value: unknown): NewApiMetering | null {
  if (!isObject(value) || !Number.isSafeInteger(value.quotaPerUnit) || (value.quotaPerUnit as number) <= 0 ||
      !["USD", "CNY", "QUOTA"].includes(value.displayType as string)) return null;
  const rate = value.usdExchangeRate;
  if (rate !== undefined && (typeof rate !== "number" || rate <= 0 || rate > 1_000_000 || Number(rate.toFixed(8)) !== rate)) return null;
  if (value.displayType === "CNY" && rate === undefined) return null;
  return { quotaPerUnit: value.quotaPerUnit as number, displayType: value.displayType as NewApiMetering["displayType"], ...(rate !== undefined ? { usdExchangeRate: rate as number } : {}) };
}

export function newapiPrepare({ profile, auth }: { profile: QuotaProfile; auth: QuotaHostAuth | null }) {
  if (!profile.origin || originOfBaseUrl(auth?.baseUrl) !== profile.origin) {
    return adapterIssue("needs-verification", false, "current model origin does not match the trusted NewAPI origin");
  }
  if (!auth?.apiKey) return adapterIssue("needs-auth", false, "no current model key resolved");
  return { kind: "request" as const, url: `${profile.origin}/api/usage/token/`, headers: { Accept: "application/json", Authorization: bearerAuthorization(auth.apiKey) } };
}

export function newapiStatusParse(status: number, body: string): NewApiMetering | null {
  if (status !== 200) return null;
  const raw = parseJsonPayload(body);
  if (!isObject(raw) || raw.success !== true || !isObject(raw.data)) return null;
  const data = raw.data;
  if (typeof data.display_in_currency !== "boolean") return null;
  return validNewApiMetering({ quotaPerUnit: data.quota_per_unit, displayType: data.display_in_currency ? data.quota_display_type : "QUOTA", usdExchangeRate: data.usd_exchange_rate });
}

/** Exact rational rounding, half away from zero. Pinned web precision: two
 * decimals at |amount| >= 1, four below 1, minimum nonzero magnitude 0.0001.
 * Raw quota remains available so a rounded/minimum display is never the ledger. */
export function newapiAmount(quota: number, meter: NewApiMetering | null): string {
  if (!meter || meter.displayType === "QUOTA") return String(quota);
  // Canonical fixed decimal also handles valid 1e-7/1e-8 JSON numbers.
  const rate = meter.displayType === "CNY" ? meter.usdExchangeRate!.toFixed(8) : "1";
  const [whole, fraction = ""] = rate.split(".");
  const denominator = BigInt(meter.quotaPerUnit) * 10n ** BigInt(fraction.length);
  const numerator = BigInt(quota) * BigInt(whole + fraction);
  const negative = numerator < 0n;
  const abs = negative ? -numerator : numerator;
  const digits = abs >= denominator ? 2 : 4;
  const scale = 10n ** BigInt(digits);
  let rounded = (abs * scale * 2n + denominator) / (denominator * 2n);
  if (abs !== 0n && rounded === 0n) rounded = 1n;
  return `${negative && rounded !== 0n ? "-" : ""}${rounded / scale}.${String(rounded % scale).padStart(digits, "0")}`;
}

export function newapiParse(status: number, headers: QuotaHeadersLike | null, body: string, context: { now: number }) {
  const failure = httpStatusIssue(status, headers, context.now);
  if (failure) return failure;
  const raw = parseJsonPayload(body);
  if (!isObject(raw) || typeof raw.code !== "boolean") return adapterIssue("protocol-error", true, "invalid NewAPI envelope");
  if (!raw.code) return adapterIssue("business-error", true, "NewAPI query failed");
  const data = raw.data;
  if (!isObject(data) || typeof data.unlimited_quota !== "boolean" ||
      ![data.total_available, data.total_used, data.total_granted, data.expires_at].every(Number.isSafeInteger) ||
      (data.expires_at as number) < 0 || (data.expires_at as number) > 8_640_000_000_000) {
    return adapterIssue("protocol-error", true, "invalid NewAPI quota fields");
  }
  const keyQuota: NewApiKeyQuota = {
    remaining: data.total_available as number, used: data.total_used as number, granted: data.total_granted as number,
    unlimited: data.unlimited_quota, expiresAt: data.expires_at === 0 ? null : (data.expires_at as number) * 1000,
    metering: null, meteringSource: "raw", remainingText: String(data.total_available), usedText: String(data.total_used),
    grantedText: String(data.total_granted), currency: "quota",
  };
  const snapshot: QuotaSnapshotData = { buckets: [], planLabel: "", ignoredBuckets: 0, truncated: false, partial: false, keyQuota };
  return { kind: "snapshot" as const, snapshot };
}

export function applyNewApiMetering(key: NewApiKeyQuota, meter: NewApiMetering | null, source: NewApiKeyQuota["meteringSource"]): NewApiKeyQuota {
  return Object.freeze({ ...key, metering: meter, meteringSource: meter ? source : "raw",
    currency: !meter || meter.displayType === "QUOTA" ? "quota" : meter.displayType,
    remainingText: newapiAmount(key.remaining, meter), usedText: newapiAmount(key.used, meter), grantedText: newapiAmount(key.granted, meter) });
}

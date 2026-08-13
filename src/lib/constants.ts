/**
 * Application-wide constants and TTL configuration.
 */

export interface TtlOption {
  label: string;
  value: number; // in seconds
}

export const TTL_OPTIONS: TtlOption[] = [
  { label: "1 Hour", value: 3600 },
  { label: "24 Hours", value: 86400 },
  { label: "7 Days", value: 604800 },
];

export const REDIS_KEY_PREFIX = "secret:";

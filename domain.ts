// domain.ts — all core variables/types & one pure function

// ---------- Enums (fixed choices) ----------
export const Role = {
  STAFF: "STAFF",
  MANAGER: "MANAGER",
  PARTNER: "PARTNER",
  BILLING_ADMIN: "BILLING_ADMIN",
} as const;
export type Role = typeof Role[keyof typeof Role];

export const ActivityType = {
  SWITCH: "switch",   // on/off timer
  QUICK: "quick",     // +15/+30/+60 buttons
  KEYPAD: "keypad",   // manual minutes
} as const;
export type ActivityType = typeof ActivityType[keyof typeof ActivityType];

export type UUID = string;


// --- Buckets ---------------------------------------------------------------
export const Bucket = {
  HLB_THINKING: "HLB Thinking",
  WORKSHOP: "Workshop / Whiteboard session",
  MS_ENG_LETTER: "Morgan Stanley Eng Letter",
  TAX_RESEARCH: "Tax Research",
} as const;
export type Bucket = typeof Bucket[keyof typeof Bucket];

export const ALL_BUCKETS: Bucket[] = [
  Bucket.HLB_THINKING,
  Bucket.WORKSHOP,
  Bucket.MS_ENG_LETTER,
  Bucket.TAX_RESEARCH,
];

// quick guard (e.g., for validation before saving)
export function isBucket(x: unknown): x is Bucket {
  return typeof x === "string" && (ALL_BUCKETS as string[]).includes(x);
}




// ---------- Entities (what we store) ----------
export interface User {
  id: UUID;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export interface Matter {
  id: UUID;
  code: string;         // e.g. "MAT-ALPHA-001" or a short deal label
  displayName?: string; // optional long name
  active: boolean;
}

export interface TimeEntry {
  id: UUID;
  userId: UUID;
  matterId: UUID;
  activityType: ActivityType;
  minutes: number;      // integer minutes
  startedAt?: Date;     // for SWITCH
  endedAt?: Date;       // for SWITCH
  createdAt: Date;      // when the record was created
}

export interface WipTarget {
  matterId: UUID;
  capAmount: number;    // dollar cap target per matter
}

export interface Rate {
  role: Role;
  hourlyRate: number;   // dollars per hour
  effectiveFrom: Date;
}

export interface Event {
  id: UUID;
  occurredAt: Date;
  actorUserId?: UUID;
  matterId?: UUID;
  eventType: string;    // e.g. "TIME_QUICK_LOG", "BILL_SENT"
  metadata?: Record<string, unknown>;
}

// ---------- Outputs (what APIs return) ----------
// one bucket’s numbers
export interface WipBucketSummary {
  bucket: string;          // e.g. "HLB Thinking"
  minutes: number;
  hours: number;
  amount: number;
  pct: number;
  status: "GREEN" | "AMBER" | "RED";
}

// full WIP summary including buckets
export interface WipSummary {
  amount: number;       // overall $
  cap: number;          // overall cap $
  pct: number;          // overall fraction
  status: "GREEN" | "AMBER" | "RED";
  minutes: number;      // overall minutes
  hours: number;        // overall hours
  ratePerHour: number;  // assumption used
  buckets: WipBucketSummary[]; // breakdown
}

// ---------- Inputs (what APIs accept) ----------
export interface LoginInput {
  email: string;
  password: string;
}

export interface QuickLogInput {
  matter_id: UUID;
  minutes: number;              // 1..480
  activity_type: ActivityType;  // "quick" | "keypad" | "switch"
}

export interface ClockInInput {
  matter_id: UUID;
}

export interface WipSummaryQuery {
  matter_id: UUID;
}

export interface NewWipTargetInput {
  matter_id: UUID;
  cap_amount: number;           // dollars
}

// ---------- Pure logic (no DB, no HTTP) ----------
export function computeWipSummary(
  entries: Pick<TimeEntry, "minutes">[],
  ratePerHour: number,
  cap: number
): WipSummary {
  const totalMinutes = entries.reduce((sum, e) => sum + (e.minutes || 0), 0);
  const amount = (totalMinutes / 60) * ratePerHour;
  const pct = cap > 0 ? amount / cap : 0;
  const status: WipSummary["status"] =
    pct >= 0.9 ? "RED" : pct >= 0.7 ? "AMBER" : "GREEN";
  return { amount, cap, pct, status };
}

// ---------- Tiny demo (run: npx ts-node domain.ts) ----------
if (require.main === module) {
  // pretend we logged 45m + 60m today on a $150/h rate, cap $5k
  const entries: Pick<TimeEntry, "minutes">[] = [{ minutes: 45 }, { minutes: 60 }];
  const summary = computeWipSummary(entries, 150, 5000);
  console.log(summary);
  // -> { amount: 262.5, cap: 5000, pct: 0.0525, status: 'GREEN' }
}
export const DoorStatus = {
  OPEN: "open",
  CLOSED: "closed",
  UNKNOWN: "unknown",
} as const;
export type DoorStatus = (typeof DoorStatus)[keyof typeof DoorStatus];

export interface DoorStatusResponse {
  status: DoorStatus;
  since: string; // ISO date string
  fetchedAt: string; // Optional, for client-side use
}

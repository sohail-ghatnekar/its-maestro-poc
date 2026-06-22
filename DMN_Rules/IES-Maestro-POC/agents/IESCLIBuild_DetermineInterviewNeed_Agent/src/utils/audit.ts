import type { AuditEvent, AuditInfo } from "../types/determineInterviewNeedTypes";

export interface AuditContext {
  myBNumber?: string;
  invocationId?: string;
}

export function buildAuditEvent(
  eventType: string,
  actor: string,
  notes: string,
  context: AuditContext = {},
): AuditEvent {
  return {
    eventType,
    timestampUtc: new Date().toISOString(),
    actor,
    actorType: actor === "agent" ? "Agent" : "System",
    notes,
    ...context,
  };
}

export function appendAuditEvent(auditInfo: AuditInfo, event: AuditEvent): AuditInfo {
  return {
    events: [...(auditInfo?.events || []), event],
  };
}

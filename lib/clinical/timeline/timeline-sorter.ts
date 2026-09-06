/**
 * Task #26 — Clinical Timeline Deterministic Sorter
 * MediKiosk Clinical Engine
 */

import { EventDatePrecision, TimelineEvent, TimelineEventType } from './types';

const EVENT_TYPE_PRIORITY: Record<TimelineEventType, number> = {
  attention_flag: 1,
  encounter: 2,
  diagnosis: 3,
  procedure: 4,
  lab: 5,
  medication: 6,
  symptom: 7,
  vital: 8,
  ayush_assessment: 9,
  document: 10,
  conversation: 11,
};

const PRECISION_RANK: Record<EventDatePrecision, number> = {
  day: 4,
  month: 3,
  year: 2,
  encounter: 1,
  unknown: 0,
};

/**
 * Normalizes event date string to comparable ISO string or numeric representation.
 * Handles "YYYY", "YYYY-MM", and "YYYY-MM-DD".
 */
function getComparableDateValue(eventDate?: string): string | null {
  if (!eventDate || typeof eventDate !== 'string') return null;
  const trimmed = eventDate.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`;
  }
  return trimmed;
}

/**
 * Sorts timeline events deterministically.
 */
export function sortTimelineEvents(
  events: TimelineEvent[],
  descending: boolean = true
): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const dateA = getComparableDateValue(a.eventDate);
    const dateB = getComparableDateValue(b.eventDate);

    // 1. Primary: Date comparison
    if (dateA && dateB) {
      if (dateA !== dateB) {
        return descending ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      }
    } else if (dateA && !dateB) {
      return -1; // Dated events come first
    } else if (!dateA && dateB) {
      return 1;
    }

    // 2. Secondary: Date precision rank
    const precA = PRECISION_RANK[a.eventDatePrecision] ?? 0;
    const precB = PRECISION_RANK[b.eventDatePrecision] ?? 0;
    if (precA !== precB) {
      return precB - precA;
    }

    // 3. Tertiary: Encounter / created_at timestamp
    const tsA = String(a.metadata?.encounterCreatedAt || a.metadata?.createdAt || '');
    const tsB = String(b.metadata?.encounterCreatedAt || b.metadata?.createdAt || '');
    if (tsA && tsB && tsA !== tsB) {
      return descending ? tsB.localeCompare(tsA) : tsA.localeCompare(tsB);
    }

    // 4. Quaternary: Event Type Priority
    const prioA = EVENT_TYPE_PRIORITY[a.eventType] ?? 99;
    const prioB = EVENT_TYPE_PRIORITY[b.eventType] ?? 99;
    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // 5. Quinary: Stable ID ordering
    return a.id.localeCompare(b.id);
  });
}

/**
 * Separates timeline events into dated and undated lists while maintaining deterministic order.
 */
export function partitionTimelineEvents(events: TimelineEvent[]): {
  datedEvents: TimelineEvent[];
  undatedEvents: TimelineEvent[];
} {
  const datedEvents: TimelineEvent[] = [];
  const undatedEvents: TimelineEvent[] = [];

  for (const ev of events) {
    if (ev.eventDate && ev.eventDate.trim().length > 0 && ev.eventDatePrecision !== 'unknown') {
      datedEvents.push(ev);
    } else {
      undatedEvents.push(ev);
    }
  }

  return { datedEvents, undatedEvents };
}

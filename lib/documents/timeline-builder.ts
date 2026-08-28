export interface MedicalTimelineEvent {
  date: string;
  type: 'consultation' | 'investigation' | 'procedure' | 'medication';
  title: string;
  details: string;
  sourceDocumentId: string;
}

export function buildTimeline(events: MedicalTimelineEvent[]): MedicalTimelineEvent[] {
  // Sort timeline chronologically (latest event first)
  return [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

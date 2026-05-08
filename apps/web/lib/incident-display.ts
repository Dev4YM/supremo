/** Maps API / Prisma incident rows to labels used in the dashboard. */

export function incidentDisplayTitle(inc: Record<string, unknown>): string {
  const title = inc.title;
  if (typeof title === 'string' && title.trim()) return title;
  const rule = inc.ruleTriggered;
  if (typeof rule === 'string' && rule.trim()) {
    return rule.replace(/_/g, ' ');
  }
  const typ = inc.type;
  if (typeof typ === 'string' && typ.trim()) {
    return typ.replace(/_/g, ' ');
  }
  return 'Incident';
}

export function incidentDisplayDescription(inc: Record<string, unknown>): string {
  const d = inc.description;
  if (typeof d === 'string' && d.trim()) return d;
  const r = inc.reasoning;
  if (typeof r === 'string' && r.trim()) return r;
  return '—';
}

export function incidentEvidenceText(inc: Record<string, unknown>): string {
  const ev = inc.evidence;
  if (ev == null) return '';
  if (typeof ev === 'string') return ev;
  try {
    return JSON.stringify(ev, null, 2);
  } catch {
    return String(ev);
  }
}

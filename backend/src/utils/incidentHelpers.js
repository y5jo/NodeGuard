export const ALLOWED_STATUSES = [
  'Reported',
  'Under Review',
  'Investigating',
  'Resolved',
  'Closed',
  'OPEN',
  'IN_PROGRESS',
  'CONTAINED',
  'CLOSED',
];

export const buildIncidentFilter = (query = {}) => {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  return filter;
};

export default {
  ALLOWED_STATUSES,
  buildIncidentFilter,
};

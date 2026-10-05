import AdminHeader from "../../Components/navbar/AdminHeader";
import { useEffect, useMemo, useRef, useState } from 'react';
import "../../Components/design/Admin/AuditLog.css";
import searchIcon from "../../public/search_icon.svg";
import { AuditLogInspectorModal } from "../../Components/Elements/auditInspect";
import Calendar from "../../Components/calendar/calendar";
import axiosClient from "../../api/axiosClient";

export const Ledger_Header = {
    title: 'Global Custody Ledger',
};

const EMPTY_FILTERS = { action: '', incidentId: '', startDate: '', endDate: '' };

const formatDateMMDDYYYY = (isodate) => {
    if (!isodate) return null;
    const [year, month, day] = isodate.split('-');
    if (!year || !month || !day) return isodate;
    return `${month}/${day}/${year.slice(-2)}`;
};


const ACTION_BADGES = {
    VERIFY_FAIL: {
        label: 'Tamper Detected', color: '#fb7185', border: 'rgba(244,63,94,0.4)', bg: 'rgba(244,63,94,0.1)', pulse: true,
    },
    VERIFY_PASS: {
        label: 'Passed Verification', color: '#34d399', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)',
    },
    INGESTION: {
        label: 'Ingestion', color: '#818cf8', border: 'rgba(99,102,241,0.3)', bg: 'rgba(99,102,241,0.1)',
    },
    VIEW: {
        label: 'View', color: '#38bdf8', border: 'rgba(14,165,233,0.3)', bg: 'rgba(14,165,233,0.1)',
    },
    DOWNLOAD: {
        label: 'Download', color: '#22d3ee', border: 'rgba(6,182,212,0.3)', bg: 'rgba(6,182,212,0.1)',
    },
    STATUS_CHANGE: {
        label: 'Status Change', color: '#fbbf24', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.1)',
    },
    CASE_ASSIGNMENT: {
        label: 'Case Assignment', color: '#c084fc', border: 'rgba(192,132,252,0.3)', bg: 'rgba(192,132,252,0.1)',
    },
    CUSTODY_TRANSFER: {
        label: 'Custody Transfer', color: '#a855f7', border: 'rgba(168,85,247,0.3)', bg: 'rgba(168,85,247,0.1)',
    },
};

export const ROLE_BADGES = {
    Admin: { color: '#E9B21B', border: 'rgba(233, 178, 27, 1)', bg: 'rgba(92, 70, 10, 0.5)', bold: true },
    Investigator: { color: '#1FFE13', border: 'rgba(38, 183, 25, 1)', bg: 'rgba(31, 254, 19, 0.20)' },
    Client: { color: '#3B82F6', border: 'rgba(59, 130, 246, 1)', bg: 'rgba(34, 37, 81, 0.5)' },
};

const FALLBACK_ACTION = { label: null, color: '#94a3b8', border: '#64748b', bg: 'rgba(100,116,139,0.15)', path: null };
const FALLBACK_ROLE = { color: '#94a3b8', border: '#64748b', bg: 'rgba(100,116,139,0.15)' };

export function ActionBadge({ action }) {
    const b = ACTION_BADGES[action] ?? { ...FALLBACK_ACTION, label: action };
    return (
        <span className={`badge${b.pulse ? ' badge--pulse' : ''}`} style={{ color: b.color, borderColor: b.border, background: b.bg }}>
            {b.path && (
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke={b.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={b.path} />
                </svg>
            )}
            {b.label}
        </span>
    );
}

export function RoleBadge({ role }) {
    const b = ROLE_BADGES[role] ?? FALLBACK_ROLE;
    return (
        <span className={`badge${b.bold ? ' badge--bold' : ''}`} style={{ color: b.color, borderColor: b.border, background: b.bg }}>
            {role}
        </span>
    );
}

export default function AuditLog({
    showing,
    total,
    incidentOptions = [],
    onSearch,
    onFiltersChange,
    entries = [],
    children,
}) {
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [inspectedEntry, setInspectedEntry] = useState(null);
    const [openDatePicker, setOpenDatePicker] = useState(null);
    const [liveEntries, setLiveEntries] = useState(null);
    const [liveIncidentOptions, setLiveIncidentOptions] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const panelRef = useRef(null);

    useEffect(() => {
        setIsLoading(true);
        axiosClient.get('/incidents/audit')
            .then(({ data }) => {
                setLiveEntries(data.entries);
                setLiveIncidentOptions(data.incidentOptions);
            })
            .catch((err) => {
                setLiveEntries([]);
                setFetchError(err?.response?.data?.message || 'Failed to load audit log entries.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const resolvedEntries = liveEntries ?? entries;
    const resolvedIncidentOptions = liveIncidentOptions ?? incidentOptions;

    const submitSearch = (value) => {
        setQuery(value);
        onSearch?.(value);
    };

    const applyFilters = (next) => {
        setFilters(next);
        onFiltersChange?.(next);
    };

    const onFilterClick = () => setShowFilters((visible) => !visible);

    useEffect(() => {
        if (!showFilters) return;

        const onDocClick = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setShowFilters(false);
                setOpenDatePicker(null);
            }
        };

        const onKey = (event) => {
            if (event.key === 'Escape') {
                setShowFilters(false);
                setOpenDatePicker(null);
            }
        };

        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [showFilters]);

    useEffect(() => {
        if (!openDatePicker) return;

        const onOutsideClick = (event) => {
            if (!event.target.closest('.audit-filter-date-control')) {
                setOpenDatePicker(null);
            }
        };

        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setOpenDatePicker(null);
            }
        };

        document.addEventListener('mousedown', onOutsideClick);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onOutsideClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [openDatePicker]);

    const filteredEntries = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return resolvedEntries.filter((entry) => {
            const matchesQuery =
                !normalizedQuery ||
                [entry.actor, entry.role, entry.ip, entry.details, entry.action, entry.incidentId]
                    .some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));

            const matchesAction = !filters.action || entry.action === filters.action;
            const matchesIncident = !filters.incidentId || entry.incidentId === filters.incidentId;

            const entryDate = new Date(entry.timestamp);
            const startDate = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
            const endDate = filters.endDate ? new Date(`${filters.endDate}T23:59:59`) : null;

            const matchesStartDate = !startDate || entryDate >= startDate;
            const matchesEndDate = !endDate || entryDate <= endDate;

            return matchesQuery && matchesAction && matchesIncident && matchesStartDate && matchesEndDate;
        });
    }, [resolvedEntries, filters, query]);

    const activeCount = Object.values(filters).filter(Boolean).length;
    const displayShowing = showing ?? filteredEntries.length;
    const displayTotal = total ?? filteredEntries.length;

    return (
        <>
            <AdminHeader />
            <div className="audit-log-container">
                <section className="audit-log-header">
                    <h1>Chain of Custody Audit Log</h1>
                    <h2>This is a log of all the changes made to the chain of custody.</h2>
                </section>

                <div className="audit-log-divider">
                    <section className="audit-log-content" ref={panelRef}>
                        <div className="audit-log-table-header">
                            <h2 className="audit-log-table-header-title">{Ledger_Header.title}</h2>
                            <span className="audit-log-count">(Showing {displayShowing} of {displayTotal})</span>

                            <div className="audit-log-search">
                                <img src={searchIcon} alt="Search" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={query}
                                    onChange={(event) => submitSearch(event.target.value)}
                                />
                                <kbd>/</kbd>
                            </div>

                            {activeCount > 0 && (
                                <button
                                    type="button"
                                    className="audit-log-clear-filters"
                                    onClick={() => {
                                        setFilters(EMPTY_FILTERS);
                                        onFiltersChange?.(EMPTY_FILTERS);
                                    }}
                                >
                                    Clear Filter
                                </button>
                            )}

                            <button type="button" className="audit-log-filter-button" onClick={onFilterClick}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3 4h18l-7 8v6l-4 2v-8z" />
                                </svg>
                                Filter
                                {activeCount > 0 && <span className="gcl-filter-count">{activeCount}</span>}
                            </button>
                        </div>

                        {children}

                        {showFilters && (
                            <div className="audit-log-filter-panel" role="region" aria-label="Ledger Filters">
                                <div className="audit-log-filter-field">
                                    <label htmlFor="filter1">Action Type:</label>
                                    <select id="filter1" value={filters.action} onChange={(event) => applyFilters({ ...filters, action: event.target.value })}>
                                        <option value="">All CoC Actions</option>
                                        {Object.keys(ACTION_BADGES).map((action) => (
                                            <option key={action} value={action}>{ACTION_BADGES[action].label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="audit-log-filter-field">
                                    <label htmlFor="filter2">Target Incident Case</label>
                                    <select id="filter2" value={filters.incidentId} onChange={(event) => applyFilters({ ...filters, incidentId: event.target.value })}>
                                        <option value="">All Incidents</option>
                                        {resolvedIncidentOptions.map((incident) => (
                                            <option key={incident.id} value={incident.id}>{incident.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="audit-log-filter-field">
                                    <label htmlFor="filter3">Date Range:</label>
                                    <div className="audit-filter-dates">
                                        {['startDate', 'endDate'].map((dateField) => (
                                            <div className="audit-filter-date-control" key={dateField}>
                                                <button
                                                    type="button"
                                                    className="audit-filter-date-button"
                                                    onClick={() => setOpenDatePicker((openField) => openField === dateField ? null : dateField)}
                                                    aria-label={`Choose ${dateField === 'startDate' ? 'start' : 'end'} date`}
                                                    aria-expanded={openDatePicker === dateField}
                                                >
                                                    {formatDateMMDDYYYY(filters[dateField]) || 'mm/dd/yy'}
                                                </button>
                                                {openDatePicker === dateField && (
                                                    <div className="audit-filter-calendar-popup">
                                                        <Calendar
                                                            value={filters[dateField]}
                                                            onChange={(dateValue) => {
                                                                applyFilters({ ...filters, [dateField]: dateValue });
                                                                setOpenDatePicker(null);
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="audit-log-body">
                            {fetchError ? (
                                <p className="audit-empty">{fetchError}</p>
                            ) : isLoading ? (
                                <p className="audit-empty">Loading Chain of Custody records...</p>
                            ) : filteredEntries.length === 0 ? (
                                <p className="audit-empty">No Chain of Custody records found.</p>
                            ) : (
                                <>
                                    <table className="audit-log-table">
                                        <thead>
                                            <tr>
                                                <th>Action</th>
                                                <th>Name</th>
                                                <th>Role</th>
                                                <th>Client IP</th>
                                                <th>Forensic Details</th>
                                                <th>Timestamp</th>
                                                <th className="audit-inspect">Inspect</th>
                                            </tr>
                                        </thead>
                                        <tbody className="audit-log-table-body">
                                            {filteredEntries.map((entry) => (
                                                <tr key={entry.id} className={entry.action === 'VERIFY_FAIL' ? 'tamper-detected' : ''}>
                                                    <td><ActionBadge action={entry.action} /></td>
                                                    <td>{entry.actor}</td>
                                                    <td><RoleBadge role={entry.role} /></td>
                                                    <td className="gcl-mono">{entry.ip}</td>
                                                    <td>{entry.details || '—'}</td>
                                                    <td className="gcl-mono">{new Date(entry.timestamp).toLocaleString()}</td>
                                                    <td className="gcl-td-right">
											<button type="button" className="audit-inspect-btn" onClick={() => setInspectedEntry(entry)}>
												Inspect
											</button> </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>


                                </>
                            )}
                        </div>
                        <AuditLogInspectorModal entry={inspectedEntry} onClose={() => setInspectedEntry(null)} />
                    </section>
                </div>
            </div>
        </>
    );
}

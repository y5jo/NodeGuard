
import { useEffect } from 'react';
import { ActionBadge, RoleBadge } from '../../pages/Admin/AuditLog';
import '../design/Admin/AuditLogInspectorModal.css';
 
export const DEFAULT_LOG_ENTRY = {
	id: '—',
	actor: 'PUBLIC_ANONYMOUS',
	ip: '—',
	incidentId: '—',
	action: 'VIEW',
	role: 'CITIZEN',
	timestamp: '—',
	evidenceRef: '—',
	fileName: '',
	hash: '',
};
 
export function AuditLogInspectorModal({ entry, onClose }) {
	useEffect(() => {
		if (!entry) return;
		const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [entry, onClose]);

	if (!entry) return null;
	const e = { ...DEFAULT_LOG_ENTRY, ...entry };
 
	return (
		<div className="alim-backdrop" onClick={onClose}>
			<div className="alim" onClick={(e) => e.stopPropagation()}>
				<div className="alim-header">
					<div className="alim-title">
						<i>&gt;_</i>
						<h2>Audit Log Deep Inspection</h2>
					</div>
					<button type="button" className="alim-close" aria-label="Close" onClick={onClose}>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="10" />
							<line x1="15" y1="9" x2="9" y2="15" />
							<line x1="9" y1="9" x2="15" y2="15" />
						</svg>
					</button>
				</div>
 
				<hr className="alim-divider" />
 
				<div className="alim-meta">
					<div className="alim-col">
						<div className="alim-field">
							<label>Log Entry ID</label>
							<span className="alim-mono alim-id alim-ellipsis">{e.id}</span>
						</div>
						<div className="alim-field">
							<label>Performer Identity</label>
							<span>{e.actor}</span>
						</div>
						<div className="alim-field">
							<label>Client IP</label>
							<span>{e.ip}</span>
						</div>
						<div className="alim-field">
							<label>Incident Ref</label>
							<span className="alim-mono alim-muted alim-ellipsis">{e.incidentId || '—'}</span>
						</div>
					</div>
 
					<div className="alim-col">
						<div className="alim-field">
							<label>Event Action</label>
							<ActionBadge action={entry.action} />
						</div>
						<div className="alim-field">
							<label>Role</label>
							<RoleBadge role={entry.role} />
						</div>
						<div className="alim-field">
							<label>Timestamp</label>
							<span>{entry.timestamp}</span>
						</div>
						<div className="alim-field">
							<label>Evidence Ref</label>
							<span className="alim-mono alim-muted alim-ellipsis">{entry.evidenceRef || '—'}</span>
						</div>
					</div>
				</div>
 
				<div className="alim-desc">
					<h3>Event Description & Hashes:</h3>
					<div className="alim-desc-box">
						<p>
							{entry.fileName ? (
								<>Evidence <span className="alim-file">"{entry.fileName}"</span> {entry.description ?? 'recorded on this entry.'}</>
							) : (
								entry.details ?? 'No additional description recorded for this entry.'
							)}
						</p>
						{entry.sha256 && <span className="alim-hash">{entry.sha256}</span>}
					</div>
				</div>
 
				<div className="alim-footer">
					<button type="button" onClick={onClose}>Close</button>
				</div>
			</div>
		</div>
	);
}
 

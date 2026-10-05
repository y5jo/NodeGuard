import AnalystHeader from "../../Components/navbar/AnalystHeader";
import { AlertTriangle, ClipboardList, Eye, RefreshCw, Search, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import "../../Components/design/Analyst/AnalystDashboard.css";

export default function AnalystDashboard({ showHeader = true, showInspect = true, adminMode = false }) {
	const navigate = useNavigate();
	const [incidents, setIncidents] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [priorityFilter, setPriorityFilter] = useState("");
	const [analysts, setAnalysts] = useState([]);
	const [assignmentIncident, setAssignmentIncident] = useState(null);
	const [assigningAnalystId, setAssigningAnalystId] = useState("");
	const [assignmentError, setAssignmentError] = useState("");

	const loadIncidents = useCallback(async () => {
		setIsLoading(true);
		setError("");
		try {
			const response = await axiosClient.get("/incidents", { params: { limit: 100 } });
			setIncidents(response.data.incidents || []);
		} catch (requestError) {
			setError(requestError.response?.data?.message || "Unable to load submitted cases.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadIncidents();
	}, [loadIncidents]);

	const loadAnalysts = useCallback(async () => {
		try {
			const response = await axiosClient.get("/auth/users");
			setAnalysts((response.data.users || []).filter((user) => user.role === "INVESTIGATOR"));
		} catch (requestError) {
			setAssignmentError(requestError.response?.data?.message || "Unable to load analysts.");
		}
	}, []);

	useEffect(() => {
		if (adminMode) loadAnalysts();
	}, [adminMode, loadAnalysts]);

	useEffect(() => {
		if (!assignmentIncident) return;
		const handleEscape = (event) => {
			if (event.key === "Escape") setAssignmentIncident(null);
		};
		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [assignmentIncident]);

	const assignIncident = async (analystId) => {
		if (!assignmentIncident || assigningAnalystId) return;
		setAssigningAnalystId(analystId);
		setAssignmentError("");
		try {
			await axiosClient.patch(`/incidents/${assignmentIncident._id}/assign`, { analystId });
			await Promise.all([loadIncidents(), loadAnalysts()]);
			setAssignmentIncident(null);
		} catch (requestError) {
			setAssignmentError(requestError.response?.data?.message || "Unable to assign this case.");
		} finally {
			setAssigningAnalystId("");
		}
	};

	const filteredIncidents = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return incidents;
		return incidents.filter((incident) =>
			[incident.trackingId, incident.title, incident.category, incident.status, incident.complainantName]
				.some((value) => String(value || "").toLowerCase().includes(query))
		);
	}, [incidents, search]);

	const displayedIncidents = useMemo(() => filteredIncidents.filter((incident) =>
		(!statusFilter || incident.status === statusFilter) && (!priorityFilter || incident.priority === priorityFilter)
	), [filteredIncidents, priorityFilter, statusFilter]);

	const metrics = useMemo(() => ({
		total: incidents.length,
		pending: incidents.filter(({ status }) => status === "Reported" || status === "Under Review").length,
		highRisk: incidents.filter(({ priority }) => priority === "HIGH" || priority === "CRITICAL").length,
		active: incidents.filter(({ status }) => status === "Investigating").length,
	}), [incidents]);

	const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-CA") : "-";

	return (
		<>
			{showHeader && <AnalystHeader />}
			<main className="analyst-dashboard">
				<div className="dashboard-heading">
					<div>
						<p className="eyebrow">Forensic operations</p>
						<h1>Case Management &amp; Investigation Dashboard</h1>
					</div>
					<button className={`refresh-button ${isLoading ? "loading" : ""}`} type="button" onClick={loadIncidents} disabled={isLoading}>
						<RefreshCw size={16} className={isLoading ? "spin" : ""} />
						Refresh cases
					</button>
				</div>

				<div className="case-metrics" aria-label="Case summary">
					<MetricCard label="Total logged cases" value={metrics.total} detail="Submitted incidents" icon={<ClipboardList />} tone="blue" />
					<MetricCard label="Pending review" value={metrics.pending} detail="Reported or under review" icon={<Search />} tone="yellow" />
					<MetricCard label="High / critical risk" value={metrics.highRisk} detail="Requires attention" icon={<AlertTriangle />} tone="pink" />
					<MetricCard label="Active investigations" value={metrics.active} detail="Currently investigating" icon={<ShieldCheck />} tone="blue" />
				</div>

				{error && <p className="dashboard-error" role="alert">{error}</p>}

				<section className="case-filter-panel" aria-label="Case filters">
					<div className="case-list-toolbar">
										<label className="search-box">
							<Search size={16} />
							<span className="sr-only">Search submitted cases</span>
							<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search submitted cases" />
						</label>
										<label className="filter-field">Status:
											<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
												<option value="">All Statuses</option><option>Reported</option><option>Under Review</option><option>Investigating</option><option>Resolved</option><option>Closed</option>
											</select>
										</label>
										<label className="filter-field">Priority:
											<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
												<option value="">All Priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
											</select>
										</label>
										<span className="case-count">Showing {displayedIncidents.length} of {incidents.length} submitted cases</span>
					</div>
								</section>

								<section className="case-list-panel" aria-label="Submitted cases">
					<div className="table-wrap">
						<table>
														<thead><tr><th>Tracking ID</th><th>Incident title</th><th>Category</th><th>Priority</th><th>Status</th><th>Complainant</th><th>Reported date</th>{(showInspect || adminMode) && <th>Action</th>}</tr></thead>
							<tbody>
														{displayedIncidents.map((incident) => <tr key={incident._id}>
									<td className="tracking-id">{incident.trackingId}</td>
									<td>{incident.title}</td><td><span className="category-badge">{incident.category}</span></td>
									<td><span className={`badge priority-${String(incident.priority).toLowerCase()}`}>{incident.priority}</span></td>
									<td><span className={`badge status-${String(incident.status).toLowerCase().replaceAll(" ", "-")}`}>{incident.status}</span></td>
									<td>{incident.complainantName || "Anonymous"}</td><td>{formatDate(incident.incidentDate)}</td>
					{showInspect && <td><button type="button" className="view-case-button" onClick={() => navigate(`/analyst/case-update?trackingId=${encodeURIComponent(incident.trackingId)}`)}><Eye size={15} aria-hidden="true" />Inspect</button></td>}
					{adminMode && (() => {
						const isAssigned = Boolean(incident.assignedTo && (typeof incident.assignedTo === 'object' ? incident.assignedTo.name : true));
						return (
							<td>
								<button
									type="button"
									className="view-case-button"
									onClick={() => {
										setAssignmentIncident({
											...incident,
											assignedTo: isAssigned ? incident.assignedTo : null,
										});
										setAssignmentError("");
									}}
								>
									<UserRound size={15} aria-hidden="true" />
									{isAssigned ? "Assigned" : "Assign"}
								</button>
							</td>
						);
					})()}
								</tr>)}
							</tbody>
						</table>
										{!isLoading && displayedIncidents.length === 0 && <div className="empty-state"><ClipboardList size={30} /><strong>{incidents.length === 0 ? "No incident reports yet" : "No matching cases"}</strong><span>{incidents.length === 0 ? "Submitted incident reports will appear here." : "Try a different search or filter."}</span></div>}
						{isLoading && <div className="empty-state">Loading submitted cases...</div>}
					</div>
				</section>
			</main>
			{adminMode && assignmentIncident && <div className="assignment-backdrop" onClick={() => setAssignmentIncident(null)}>
				<section className="assignment-dialog" role="dialog" aria-modal="true" aria-labelledby="assignment-title" onClick={(event) => event.stopPropagation()}>
					<p className="eyebrow">{assignmentIncident.assignedTo ? "Reassign case" : "Case assignment"}</p>
					<h2 id="assignment-title">{assignmentIncident.assignedTo ? `Reassign ${assignmentIncident.trackingId}` : `Assign ${assignmentIncident.trackingId}`}</h2>
					<p className="assignment-case-title">{assignmentIncident.title}</p>
					{assignmentError && <p className="assignment-feedback assignment-feedback-error" role="alert">{assignmentError}</p>}
					<div className="analyst-assignment-list">
						{analysts.map((analyst) => {
							const analystId = analyst._id || analyst.id;
							const isCurrent = assignmentIncident.assignedTo && String(assignmentIncident.assignedTo._id || assignmentIncident.assignedTo) === String(analystId);
							return <article className="analyst-assignment-row" key={analystId}>
								<div className="analyst-assignment-person"><strong>{analyst.name}</strong><small>{analyst.email}</small></div>
								<span className="analyst-case-count" aria-label={`${analyst.assignedCaseCount || 0} assigned cases`}><strong>{analyst.assignedCaseCount || 0}</strong><small>cases</small></span>
								{isCurrent
									? <span className="assignment-current-label">Current Assignee</span>
									: <button type="button" className="view-case-button" disabled={Boolean(assigningAnalystId)} onClick={() => assignIncident(analystId)}>
										{assigningAnalystId === analystId ? "Assigning..." : "Assign"}
									  </button>}
							</article>;
						})}
						{analysts.length === 0 && <p className="assignment-empty">No active analysts are available.</p>}
					</div>
				</section>
			</div>}
		</>
	);
}

function MetricCard({ label, value, detail, icon, tone }) {
	return <article className={`metric-card metric-${tone}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

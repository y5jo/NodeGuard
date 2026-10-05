import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import ClientHeader from "../../Components/navbar/ClientHeader";
import axiosClient from "../../api/axiosClient";
import "../../Components/design/client/TrackReport.css";
import { ProgressStepper } from "../../Components/Elements/ProgressStepper";

const translate = (key, values = {}) => {
    const messages = {
        'track.progress_title': 'Report progress',
        'track.progress_sub': 'Follow the current status of your report.',
        'track.stage_counter': `Stage ${values.current} of ${values.total}`,
    };

    return messages[key] ?? key;
};

const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const workflowStages = [
    { key: 'Reported', label: 'Reported', title: 'Report submitted', definition: 'Your report has been received.' },
    { key: 'Under Review', label: 'Under Review', title: 'Under review', definition: 'Our team is reviewing the report.' },
    { key: 'Investigating', label: 'Investigating', title: 'Investigation in progress', definition: 'Our team is investigating the reported incident.' },
    { key: 'Resolved', label: 'Resolved', title: 'Report resolved', definition: 'The report has been resolved.' },
    { key: 'Closed', label: 'Closed', title: 'Report closed', definition: 'The report has been closed.' },
];

export default function TrackReport() {
    const [searchParams] = useSearchParams();
    const initialTrackingId = searchParams.get("trackingId") || "";
    const [trackingId, setTrackingId] = useState(initialTrackingId);
    const [incident, setIncident] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const findIncident = useCallback(async (value) => {
        const normalizedId = value.trim().toUpperCase().replace(/\s+/g, "");
        setIncident(null);
        setError("");

        if (!normalizedId) {
            setError("Enter your tracking ID to find your case.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axiosClient.get(`/incidents/track/${encodeURIComponent(normalizedId)}`);
            setIncident(response.data.incident);
            setTrackingId(response.data.incident.trackingId);
        } catch (requestError) {
            setError(requestError.response?.data?.message || "Unable to find a case with that tracking ID.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (initialTrackingId) findIncident(initialTrackingId);
    }, [findIncident, initialTrackingId]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isLoading) return;
        await findIncident(trackingId);
    };

    const statusClass = incident?.status?.toLowerCase().replace(/\s+/g, "-") || "";
    const currentStageIndex = incident
        ? incident.status === "Closed"
            ? workflowStages.length - 1
            : Math.max(0, workflowStages.findIndex((stage) => stage.key === incident.status))
        : -1;
    const caseNotes = Array.isArray(incident?.notes) ? [...incident.notes].reverse() : [];

    return (
            <main className="track-report-page">
                <ClientHeader />
                <section className="track-report-shell" aria-label="Track a case">
                    <form className="track-report-form" onSubmit={handleSubmit}>
                        <label htmlFor="tracking-id">Enter Tracking ID</label>
                        <div className="track-report-input-row">
                            <input
                                id="tracking-id"
                                value={trackingId}
                                onChange={(event) => setTrackingId(event.target.value)}
                                placeholder="e.g. CASE-2026-00005"
                                autoComplete="off"
                                aria-describedby={error ? "tracking-error" : undefined}
                            />
                            <button type="submit" disabled={isLoading}>
                                {isLoading ? <span className="track-report-spinner" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
                                {isLoading ? "Searching" : "Find case"}
                                {!isLoading && <ArrowRight size={15} aria-hidden="true" />}
                            </button>
                        </div>
                    </form>

                    {error && <p className="track-report-error" id="tracking-error" role="alert">{error}</p>}

                    {incident && (
                        <section className="tracked-case" aria-live="polite" aria-label="Case details">
                            <header className="tracked-case-header">
                                <div className="tracked-case-id-row">
                                    <span className="tracked-case-id">{incident.trackingId}</span>
                                    <span className={`tracked-case-status ${statusClass}`}>
                                        <span aria-hidden="true" />{incident.status}
                                    </span>
                                </div>
                                <h2>{incident.title}</h2>
                                <div className="tracked-case-meta">
                                    <div><span>Category</span><strong>{incident.category || "-"}</strong></div>
                                    <div><span>Status</span><strong className={`tracked-case-status-text ${statusClass}`}>{incident.status || "-"}</strong></div>
                                    <div><span>Reported date</span><strong>{formatDate(incident.createdAt || incident.incidentDate)}</strong></div>
                                </div>
                                <div className="tracked-case-update-log">
                                    <h3>Update Log</h3>
                                    {caseNotes.length ? caseNotes.map((note, index) => (
                                        <p key={note._id || `${note.date}-${index}`}>
                                            <span>Log {caseNotes.length - index}:</span> {note.text}
                                        </p>
                                    )) : <p>No case updates have been recorded yet.</p>}
                                </div>
                            </header>

                            <section className="progress-stepper-section">
                                <ProgressStepper
                                    trackingStages={workflowStages}
                                    currentStageIndex={currentStageIndex}
                                    incidentData={incident}
                                    t={translate}
                                />
                            </section>
                        </section>
                    )}
                </section>
            </main>
    );
}
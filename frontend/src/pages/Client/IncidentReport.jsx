import ClientHeader from "../../Components/navbar/ClientHeader";
import Calendar from "../../Components/calendar/calendar";
import { CalendarDays, Check, CheckCircle2, Copy, FileUp, ShieldAlert, UploadCloud, X } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { useNavigate } from "react-router-dom";
import "../../Components/design/client/IncidentReport.css";
import { useCallback, useEffect, useRef, useState } from "react";

export default function IncidentReport() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [incidentDateError, setIncidentDateError] = useState("");
  const [invalidFields, setInvalidFields] = useState([]);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [evidenceError, setEvidenceError] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const calendarContainerRef = useRef(null);
  const evidenceInputRef = useRef(null);

  const supportedEvidenceTypes = ["png", "jpg", "jpeg", "pdf", "txt", "csv", "log", "eml", "zip"];
  const maxEvidenceSize = 50 * 1024 * 1024;

  useEffect(() => {
    if (!isCalendarOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (!calendarContainerRef.current?.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };
    const handleEscape = (event) => { if (event.key === "Escape") setIsCalendarOpen(false); };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isCalendarOpen]);

  const closeSuccessDialog = useCallback(() => setIsSuccessDialogOpen(false), []);

  useEffect(() => {
    if (!isSuccessDialogOpen) return undefined;
    const handleEscape = (event) => { if (event.key === "Escape") closeSuccessDialog(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSuccessDialogOpen, closeSuccessDialog]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(previewFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [previewFile]);

  useEffect(() => {
    if (!previewFile) return undefined;
    const handleEscape = (event) => { if (event.key === "Escape") setPreviewFile(null); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [previewFile]);

  const formatIncidentDate = (dateValue) => {
    if (!dateValue) return "";

    const [year, month, day] = dateValue.split("-");
    return `${month}/${day}/${year}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError("");

    const missingFields = Array.from(event.currentTarget.querySelectorAll("[data-required-field]"))
      .filter((field) => !field.value.trim())
      .map((field) => field.dataset.requiredField);

    if (evidenceFiles.length === 0) missingFields.push("evidence");
    setInvalidFields(missingFields);

    if (missingFields.length > 0) {
      setIncidentDateError("");
      return;
    }

    if (incidentDate && incidentDate > new Date().toISOString().slice(0, 10)) {
      setIncidentDateError("Incident date cannot be later than today.");
      return;
    }

    setIncidentDateError("");

    const formData = new FormData(event.currentTarget);
    formData.set("incidentDate", incidentDate);
    evidenceFiles.forEach((file) => formData.append("files", file));

    setIsSubmitting(true);
    try {
      const response = await axiosClient.post("/incidents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTrackingId(response.data.trackingId);
      setCopyFeedback("");
      setIsSuccessDialogOpen(true);
    } catch (error) {
      setSubmitError(error.response?.data?.message || "Unable to submit the report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearFieldError = (fieldName) => {
    setInvalidFields((fields) => fields.filter((field) => field !== fieldName));
  };

  const handleEvidenceSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    const unsupportedFile = selectedFiles.find((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      return !supportedEvidenceTypes.includes(extension);
    });

    if (unsupportedFile) {
      setEvidenceError(`${unsupportedFile.name} is not a supported file type.`);
      event.target.value = "";
      return;
    }

    const totalSize = [...evidenceFiles, ...selectedFiles].reduce((size, file) => size + file.size, 0);

    if (totalSize > maxEvidenceSize) {
      setEvidenceError("The total evidence file size must be 50MB or less.");
      event.target.value = "";
      return;
    }

    setEvidenceFiles((files) => [...files, ...selectedFiles]);
    clearFieldError("evidence");
    setEvidenceError("");
    event.target.value = "";
  };

  const openEvidencePicker = () => evidenceInputRef.current?.click();

  const copyTrackingId = async () => {
    try {
      await navigator.clipboard.writeText(trackingId);
      setCopyFeedback("Tracking ID copied.");
    } catch {
      setCopyFeedback("Copy is unavailable. Please select and copy the tracking ID.");
    }
  };

  const removeEvidenceFile = (fileToRemove) => {
    setEvidenceFiles((files) => files.filter((file) => file !== fileToRemove));
    if (previewFile === fileToRemove) setPreviewFile(null);
  };

  const getFileExtension = (file) => file.name.split(".").pop()?.toLowerCase();

  const isPreviewableFile = (file) =>
    file.type.startsWith("image/") ||
    file.type === "application/pdf" ||
    ["txt", "csv", "log", "eml"].includes(getFileExtension(file));

  return (
    <div className="incident-report-page">
      <ClientHeader />

      <main className="incident-report-shell">
        <form className="incident-report-form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field-label">
              Incident Title/Headline <span className="required">*</span>
            </span>
            <input
              type="text"
              name="title"
              placeholder="Enter incident title"
              data-required-field="incidentTitle"
              required
              className={`text-input${invalidFields.includes("incidentTitle") ? " input-invalid" : ""}`}
              onChange={() => clearFieldError("incidentTitle")}
            />
          </label>

          <div className="two-col">
            <label className="field">
              <span className="field-label">
                Incident Category <span className="required">*</span>
              </span>
              <select
                value={selectedCategory}
                                name="category"
                onChange={(event) => {
                  setSelectedCategory(event.target.value);
                  clearFieldError("incidentCategory");
                }}
                data-required-field="incidentCategory"
                required
                className={`select-input${invalidFields.includes("incidentCategory") ? " input-invalid" : ""}`}
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, transparent 50%, #dfeeff 50%), linear-gradient(135deg, #dfeeff 50%, transparent 50%)",
                  backgroundPosition: "calc(100% - 18px) calc(50% - 3px), calc(100% - 12px) calc(50% - 3px)",
                  backgroundSize: "6px 6px, 6px 6px",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <option value="" disabled>Select category</option>
                <option value="Phishing">Phishing</option>
                <option value="Smishing / Vishing">Smishing / Vishing</option>
                <option value="Identity Theft">Identity Theft</option>
                <option value="Account Takeover">Account Takeover</option>
                <option value="Financial Fraud">Financial Fraud</option>
                <option value="Business Email Compromise">Business Email Compromise</option>
                <option value="Ransomware">Ransomware</option>
                <option value="Malware / Spyware">Malware / Spyware</option>
                <option value="Credential Stuffing">Credential Stuffing</option>
                <option value="Data Breach">Data Breach</option>
                <option value="Online Harassment / Cyberbullying">Online Harassment / Cyberbullying</option>
                <option value="Impersonation / Fake Profiles">Impersonation / Fake Profiles</option>
                <option value="Extortion">Extortion</option>
                <option value="Crypto Scam">Crypto Scam</option>
                <option value="Social Engineering">Social Engineering</option>
                <option value="Other">Other</option>
              </select>
            </label>

            {selectedCategory === "Other" && (
              <label className="field">
                <span className="field-label">
                  Please specify <span className="required">*</span>
                </span>
                <input
                  type="text"
                  name="categoryDetails"
                  placeholder="Describe the incident category"
                  data-required-field="otherCategory"
                  required
                  className={`text-input${invalidFields.includes("otherCategory") ? " input-invalid" : ""}`}
                  onChange={() => clearFieldError("otherCategory")}
                />
              </label>
            )}

            <label className="field">
              <span className="field-label">
                Incident Date <span className="required">*</span>
              </span>
              <div className="input-with-icon" ref={calendarContainerRef}>
                <input
                  type="text"
                  name="incidentDate"
                  placeholder="MM/DD/YYYY"
                  data-required-field="incidentDate"
                  required
                  className={`text-input date-input${invalidFields.includes("incidentDate") ? " input-invalid" : ""}`}
                  value={formatIncidentDate(incidentDate)}
                  readOnly
                />
                <button
                  type="button"
                  className="calendar-trigger"
                  onClick={() => setIsCalendarOpen((isOpen) => !isOpen)}
                  aria-label="Open incident date picker"
                  aria-expanded={isCalendarOpen}
                >
                  <CalendarDays className="calendar-icon" size={18} />
                </button>
                {isCalendarOpen && (
                  <div className="calendar-popup">
                    <Calendar
                      value={incidentDate}
                      maxDate={new Date().toISOString().slice(0, 10)}
                      onChange={(dateValue) => {
                        setIncidentDate(dateValue);
                        setIncidentDateError("");
                        clearFieldError("incidentDate");
                        setIsCalendarOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              {incidentDateError && <span className="field-error" role="alert">{incidentDateError}</span>}
            </label>
          </div>

          <div className="two-col">
            <label className="field">
              <span className="field-label">
                Platform or Channel <span className="required">*</span>
              </span>
              <select
                value={selectedPlatform}
                                name="platform"
                onChange={(event) => {
                  setSelectedPlatform(event.target.value);
                  clearFieldError("platform");
                }}
                data-required-field="platform"
                required
                className={`select-input${invalidFields.includes("platform") ? " input-invalid" : ""}`}
              >
                <option value="" disabled>Choose platform</option>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Social Media">Social Media</option>
                <option value="Messaging App">Messaging App</option>
                <option value="Banking / Payment App">Banking / Payment App</option>
                <option value="Online Shopping Platform">Online Shopping Platform</option>
                <option value="Gaming Platform">Gaming Platform</option>
                <option value="Work / Collaboration Platform">Work / Collaboration Platform</option>
                <option value="Website / Web Portal">Website / Web Portal</option>
                <option value="Mobile App">Mobile App</option>
                <option value="Crypto Exchange / Wallet">Crypto Exchange / Wallet</option>
                <option value="Other">Other</option>
              </select>
            </label>

            {selectedPlatform === "Other" && (
              <label className="field">
                <span className="field-label">
                  Please specify <span className="required">*</span>
                </span>
                <input
                  type="text"
                  name="platformDetails"
                  placeholder="Describe the platform or channel"
                  data-required-field="otherPlatform"
                  required
                  className={`text-input${invalidFields.includes("otherPlatform") ? " input-invalid" : ""}`}
                  onChange={() => clearFieldError("otherPlatform")}
                />
              </label>
            )}

            <label className="field">
              <span className="field-label">
                Estimated Financial Loss <span className="required">*</span>
              </span>
              <div className="currency-field">
                <span className="currency-symbol">PHP</span>
                <input
                  type="number"
                  name="estimatedLoss"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  data-required-field="financialLoss"
                  required
                  className={`currency-input${invalidFields.includes("financialLoss") ? " input-invalid" : ""}`}
                  onChange={() => clearFieldError("financialLoss")}
                />
              </div>
            </label>
          </div>

          <label className="field">
            <span className="field-label">
              Suspect Identifiers <span className="required">*</span>
            </span>
            <input
              type="text"
              name="suspectIdentifiers"
              placeholder="Enter email, phone number, username, or other identifier"
              data-required-field="suspectIdentifiers"
              required
              className={`text-input${invalidFields.includes("suspectIdentifiers") ? " input-invalid" : ""}`}
              onChange={() => clearFieldError("suspectIdentifiers")}
            />
          </label>

          <label className="field">
            <span className="field-label">
              Chronological Summary of What Happened <span className="required">*</span>
            </span>
            <textarea
              rows="7"
              name="narrative"
              placeholder="Describe what happened in chronological order"
              data-required-field="incidentSummary"
              required
              className={`textarea-input${invalidFields.includes("incidentSummary") ? " input-invalid" : ""}`}
              onChange={() => clearFieldError("incidentSummary")}
            />
          </label>

          <div className="complaint-panel">
            <label className="field complaint-heading">
              <span className="field-label">Complaint Details (optional)</span>
            </label>
            <p className="panel-note">
              Anonymous Filing: You do not need to add a complaint. Complaint details are strictly optional and confidential.
            </p>

            <div className="two-col complaint-grid">
              <label className="field">
                <span className="field-label">Your Name</span>
                <input type="text" name="complainantName" placeholder="Enter your name (optional)" className="text-input" />
              </label>

              <label className="field">
                <span className="field-label">Contact Number or Email</span>
                <input type="text" name="complainantContact" placeholder="Enter phone number or email (optional)" className="text-input" />
              </label>
            </div>
          </div>

          <div className="upload-panel">
            <label className="field upload-label">
              <span className="field-label">
                Digital Evidence Attachment <span className="required">*</span>
              </span>
            </label>

            <div
              className={`upload-box${invalidFields.includes("evidence") ? " input-invalid" : ""}`}
              role="button"
              tabIndex="0"
              onClick={openEvidencePicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openEvidencePicker();
                }
              }}
            >
              <input
                ref={evidenceInputRef}
                className="upload-file-input"
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.txt,.csv,.log,.eml,.zip"
                multiple
                onChange={handleEvidenceSelection}
              />
              <div className="upload-icon-wrap">
                <UploadCloud size={52} strokeWidth={1.7} />
              </div>
              <p className="upload-title">Drop files here or click to browse</p>
              <p className="upload-meta">Supported: PNG, JPG, PDF, TXT, CSV, LOG, EML, ZIP (Max 50MB)</p>
              <span className="upload-button">
                <FileUp size={16} />
                Drop files here or click to browse
              </span>
              {evidenceFiles.length > 0 && (
                <ul className="upload-file-list">
                  {evidenceFiles.map((file) => (
                    <li className="upload-file-item" key={`${file.name}-${file.size}-${file.lastModified}`}>
                      <button
                        type="button"
                        className="upload-file-name"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPreviewFile(file);
                        }}
                      >
                        {file.name}
                      </button>
                      <button
                        type="button"
                        className="remove-file-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeEvidenceFile(file);
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {evidenceError && <p className="upload-error" role="alert">{evidenceError}</p>}
            </div>
          </div>

          <div className="security-banner">
            <div className="security-icon-wrap">
              <ShieldAlert size={22} />
            </div>
            <p>
              Evidentiary Assurance: Your file is cryptographically hashed using streaming SHA-256 upon reception. This mathematical signature is recorded to an append-only ledger to ensure our continuity and admissibility.
            </p>
          </div>

          {submitError && <p className="field-error" role="alert">{submitError}</p>}

          <div className="form-footer">
            <p>
              Fields marked with <span className="required-inline">*</span> are required for official intake.
            </p>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </main>

      {isSuccessDialogOpen && (
        <div className="report-success-backdrop" onClick={closeSuccessDialog}>
          <section
            className="report-success-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="report-success-title"
            aria-describedby="report-success-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="report-success-icon">
              <CheckCircle2 size={28} />
            </div>
            <h2 id="report-success-title">Report submitted</h2>
            <p id="report-success-message">You have successfully submitted a report.</p>
            <div className="report-tracking-id-row">
              <p className="report-tracking-id">Tracking ID: <strong>{trackingId}</strong></p>
              <button
                type="button"
                className="report-copy-tracking-id"
                onClick={copyTrackingId}
                aria-label={copyFeedback === "Tracking ID copied." ? "Tracking ID copied" : "Copy tracking ID"}
                title={copyFeedback === "Tracking ID copied." ? "Tracking ID copied" : "Copy tracking ID"}
              >
                {copyFeedback === "Tracking ID copied." ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>
            {copyFeedback && <p className="report-copy-feedback" role="status">{copyFeedback}</p>}
            <div className="report-success-actions">
              <button
                type="button"
                onClick={() => navigate(`/client/track?trackingId=${encodeURIComponent(trackingId)}`)}
                autoFocus
              >
                Go to Track Case
              </button>
              <button type="button" onClick={() => navigate("/client")}>
                Return to Home
              </button>
            </div>
            <div className="report-tracking-warning" role="note">
              <ShieldAlert size={22} aria-hidden="true" />
              <p><strong>IMPORTANT:</strong> Do not lose this tracking key. Because no user accounts are created, this key is the only way to access public case updates.</p>
            </div>
          </section>
        </div>
      )}

      {previewFile && (
        <div className="file-preview-backdrop" role="presentation" onClick={() => setPreviewFile(null)}>
          <section className="file-preview-modal" role="dialog" aria-modal="true" aria-label={`Preview of ${previewFile.name}`} onClick={(event) => event.stopPropagation()}>
            <div className="file-preview-header">
              <strong>{previewFile.name}</strong>
              <button type="button" className="file-preview-close" onClick={() => setPreviewFile(null)} aria-label="Close preview">
                <X size={18} />
              </button>
            </div>
            <div className="file-preview-content">
              {previewUrl && previewFile.type.startsWith("image/") && <img src={previewUrl} alt={`Preview of ${previewFile.name}`} />}
              {previewUrl && previewFile.type === "application/pdf" && <iframe src={previewUrl} title={`Preview of ${previewFile.name}`} />}
              {previewUrl && ["txt", "csv", "log", "eml"].includes(getFileExtension(previewFile)) && <iframe src={previewUrl} title={`Preview of ${previewFile.name}`} />}
              {!isPreviewableFile(previewFile) && (
                <p>This file type cannot be previewed here. You can download it instead.</p>
              )}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}


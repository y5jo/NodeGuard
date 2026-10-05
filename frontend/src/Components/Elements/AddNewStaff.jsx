import { useEffect, useState } from 'react';
import '../design/Admin/AddNewStaffModal.css';

export const PROVISION_STAFF_HEADER = {
	title: 'Provision New Staff',
	description: 'Grant authorized investigator staff access',
};

export const PROVISION_STAFF_FIELDS = [
	{ name: 'name', label: 'Profile Name', type: 'text', placeholder: 'Enter full name', required: true },
	{ name: 'username', label: 'Username', type: 'text', placeholder: 'Enter username', required: true },
	{ name: 'password', label: 'Generate Password', type: 'password', placeholder: 'Enter password', required: true },
];

const DEFAULT_ROLE = 'Investigator';
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function ProvisionStaffModal({ isOpen, onSave, onClose, serverError, isSubmitting = false }) {
	useEffect(() => {
		if (!isOpen) return;
		const handleEscape = (event) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [isOpen, onClose]);

	const [values, setValues] = useState(() =>
		Object.fromEntries(PROVISION_STAFF_FIELDS.map((f) => [f.name, '']))
	);

	if (!isOpen) return null;

	const setField = (name, value) => setValues((v) => ({ ...v, [name]: value }));
	const username = values.username.trim();
	const isValid = PROVISION_STAFF_FIELDS.every((f) => !f.required || values[f.name].trim())
		&& USERNAME_PATTERN.test(username);

	const submit = (e) => {
		e.preventDefault();
		if (!isValid || isSubmitting) return;
		onSave({
			name: values.name.trim(),
			username,
			email: `${username.toLowerCase()}@nodeguard.local`,
			password: values.password,
			role: DEFAULT_ROLE,
		});
	};

	return (
		<div className="psm-backdrop" onClick={onClose}>
			<div className="psm" onClick={(e) => e.stopPropagation()}>
				<div className="psm-header">
					<div className="psm-heading">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="9" cy="7" r="4" />
							<path d="M2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" />
							<line x1="19" y1="8" x2="19" y2="14" />
							<line x1="16" y1="11" x2="22" y2="11" />
						</svg>
						<div>
							<h2>{PROVISION_STAFF_HEADER.title}</h2>
							<p>{PROVISION_STAFF_HEADER.description}</p>
						</div>
					</div>
					<button type="button" className="psm-close" aria-label="Close" onClick={onClose}>
						✕
					</button>
				</div>

				<hr className="psm-divider" />

				<form className="psm-form" onSubmit={submit}>
					{PROVISION_STAFF_FIELDS.map((f) => (
						<div className="psm-field" key={f.name}>
							<label htmlFor={f.name}>
								{f.label} {f.required && <span>*</span>}
							</label>
							{f.name === 'username' ? (
								<div className="psm-input-with-suffix">
									<input
										id={f.name}
										type={f.type}
										value={values[f.name]}
										placeholder={f.placeholder}
										onChange={(e) => setField(f.name, e.target.value)}
										required={f.required}
										pattern="[A-Za-z0-9._-]+"
										maxLength={64}
										autoCapitalize="none"
										autoComplete="username"
										title="Use letters, numbers, dots, underscores, or hyphens."
									/>
									<span aria-hidden="true">@nodeguard.local</span>
								</div>
							) : (
								<input
									id={f.name}
									type={f.type}
									value={values[f.name]}
									placeholder={f.placeholder}
									onChange={(e) => setField(f.name, e.target.value)}
									required={f.required}
								/>
							)}
						</div>
					))}
					<div className="psm-footer">
						{serverError && <p role="alert" style={{ color: "var(--color-error, #f87171)", marginBottom: 8, fontSize: "0.85rem" }}>{serverError}</p>}
						<button type="submit" className="psm-save" disabled={!isValid || isSubmitting}>
							{isSubmitting ? 'Provisioning...' : 'Add New Staff'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}


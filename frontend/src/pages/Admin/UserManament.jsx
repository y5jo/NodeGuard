import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import AdminHeader from "../../Components/navbar/AdminHeader";
import { ProvisionStaffModal } from "../../Components/Elements/AddNewStaff";
import { SessionProvisioningLog } from "../../Components/Elements/SessionProvisonLog";
import "../../Components/design/Admin/UserManagement.css";
import axiosClient from "../../api/axiosClient";
import auditLogo from "../../public/audit_logo.svg";

const FORENSIC_CLEARANCE_BADGES = [
	{ id: "role", label: "Roles: Investigator", variant: "blue" },
	{ id: "encryption", label: "Streaming SHA-256 Vault", variant: "green" },
	{ id: "hashing", label: "Bcrypt 10 Rounds", variant: "gray" },
];

const FORENSIC_ROLE_CLEARANCE_CARD = {
	title: "Forensic Role Clearance Architecture",
	description:
		"Investigator accounts are provisioned with Level-2 system clearance.",
	badges: FORENSIC_CLEARANCE_BADGES,
};

const PROVISION_NOTE = {
	label: "Forensic Security & Audit",
	icon: auditLogo,
	Description: "All investigator activities—logging in, viewing evidence files, calculating checksums, and updating notes—are recorded in the append-only Chain of Custody ledger.",
};

export default function UserManament() {
	const [isProvisionModalOpen, setProvisionModalOpen] = useState(false);
	const [entries, setEntries] = useState([]);
	const [provisionError, setProvisionError] = useState("");
	const [isProvisioningStaff, setIsProvisioningStaff] = useState(false);
	const [removeError, setRemoveError] = useState("");
	const [removingStaffId, setRemovingStaffId] = useState("");
	const [isLoadingStaff, setIsLoadingStaff] = useState(true);

	useEffect(() => {
		setIsLoadingStaff(true);
		axiosClient.get("/auth/users").then((res) => {
			const users = res.data.users || [];
			setEntries(users.map((u) => ({
				id: u.id || u._id,
				name: u.name,
				email: u.email,
				role: u.role === "ADMIN" ? "Admin" : "Investigator",
				time: new Date(u.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
			})));
		}).catch(() => {})
		.finally(() => setIsLoadingStaff(false));
	}, []);

	const handleStaffSave = async (staff) => {
		if (isProvisioningStaff) return;
		setProvisionError("");
		setIsProvisioningStaff(true);
		try {
			const res = await axiosClient.post("/auth/register", {
				name: staff.name,
				email: staff.email,
				password: staff.password,
			});
			const u = res.data.user;
			const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
			setEntries((current) => [{ id: u.id || u._id, name: u.name, email: u.email, role: "Investigator", time }, ...current]);
			setProvisionModalOpen(false);
		} catch (err) {
			setProvisionError(err.response?.data?.message || "Failed to provision staff account.");
		} finally {
			setIsProvisioningStaff(false);
		}
	};

	const handleStaffRemove = async (id) => {
		if (removingStaffId) return;
		setRemovingStaffId(id);
		setRemoveError("");
		try {
			await axiosClient.delete(`/auth/users/${id}`);
			setEntries((current) => current.filter((entry) => entry.id !== id));
		} catch (err) {
			setRemoveError(err.response?.data?.message || "Failed to remove staff account.");
		} finally {
			setRemovingStaffId("");
		}
	};

	return (
		<>
			<AdminHeader />
			<div className="user-management-container">
				<section className="user-management-header">
					<h1>User Management</h1>
					<h2>Manage user accounts, roles, and permissions within the system.</h2>
				</section>

				<section className="user-management-content">
					<div className="user-management-left">
						<div className="user-left-info">
							<div className="user-left-info-title">
								<UserRound aria-hidden="true" />
								<h3>Investigator Staff Access</h3>
							</div>
							<p className="user-left-info-description">
								Manage the access and permissions of investigator staff members within the system.
								Assign roles, update user information, and ensure appropriate access levels for each user.
							</p>

							<div className="user-left-info_container">
								<div className="user-left-info-Header">
									<h3>{FORENSIC_ROLE_CLEARANCE_CARD.title}</h3>
									<p>{FORENSIC_ROLE_CLEARANCE_CARD.description}</p>
									<div className="forensic-clearance-badges">
										{FORENSIC_ROLE_CLEARANCE_CARD.badges.map((badge) => (
											<span
												className={`forensic-clearance-badge forensic-clearance-badge--${badge.variant}`}
												key={badge.id}
											>
												{badge.label}
											</span>
										))}
									</div>
								</div>
								<button
									className="user-management-button"
									type="button"
									onClick={() => setProvisionModalOpen(true)}
								>
									Provision New Staff
								</button>
							</div>
						</div>
					</div>
					<div className="user-management-right">
						{removeError && <p role="alert">{removeError}</p>}
						<SessionProvisioningLog
							entries={entries}
							onRemove={handleStaffRemove}
							removingStaffId={removingStaffId}
							isLoading={isLoadingStaff}
						/>
						<div className="user-management-note">
							<div className="user-management-note-title">
								<img src={PROVISION_NOTE.icon} alt="" aria-hidden="true" />
								<h3>{PROVISION_NOTE.label}</h3>
							</div>
							<p>{PROVISION_NOTE.Description}</p>
						</div>
					</div>
				</section>
				<ProvisionStaffModal
					isOpen={isProvisionModalOpen}
					onSave={handleStaffSave}
					serverError={provisionError}
					isSubmitting={isProvisioningStaff}
					onClose={() => { setProvisionModalOpen(false); setProvisionError(""); }}
				/>
			</div>
		</>
	);
}

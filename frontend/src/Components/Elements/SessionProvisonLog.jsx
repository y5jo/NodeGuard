import { useState } from 'react';
import '../design/Admin/SessionProvisionLog.css';
import provisionLogo from '../../public/log_logo.svg';

const bookmark = provisionLogo;

const nameOf = ({ name, email }) => name?.trim() || email.split('@')[0];


export function SessionProvisioningLog({ entries, onRemove, removingStaffId = "", isLoading = false }) {
  const [selected, setSelected] = useState(null);
  const toggle = (id) => setSelected((cur) => (cur === id ? null : id));
 
  return (
    <section className="spl">
      <header>
        <img src={bookmark} alt="" />
        <h2>Session Provisioning Log</h2>
        <span>{entries.length} added</span>
      </header>
 
      {isLoading ? (
        <p className="empty">Loading staff accounts...</p>
      ) : entries.length === 0 ? (
        <p className="empty">No staff added yet</p>
      ) : (
        <ul>
          {entries.map((e) => (
            <li
              key={e.id}
              className={e.id === selected ? 'on' : ''}
              tabIndex={0}
              onClick={() => toggle(e.id)}
              onKeyDown={(ev) => {
                if (ev.target !== ev.currentTarget) return;
                if (ev.key === 'Enter') toggle(e.id);
                if (ev.key === 'Escape') setSelected(null);
              }}
            >
              <div className="who">
                <p>{nameOf(e)}</p>
                <p>{e.email}</p>
                <p>Role: {e.role}</p>
              </div>
              <div className="meta">
                <span className="badge">Active</span>
                <div className="slot">
                  {e.id === selected && e.role !== 'Admin' ? (
                    <button
                      type="button"
                      disabled={Boolean(removingStaffId)}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onRemove(e.id);
                      }}
                    >
                      {removingStaffId === e.id ? 'Removing...' : 'Remove'}
                    </button>
                  ) : (
                    `Time: ${e.time}`
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
 
 
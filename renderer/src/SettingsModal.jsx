import { useState, useEffect } from 'react';
import './SettingsModal.css';

const DEFAULT_TARGET = -14;

function SettingsModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('library');

  // Library settings — keep as string locally to allow typing "-" or empty
  const [targetInput, setTargetInput] = useState(String(DEFAULT_TARGET));

  useEffect(() => {
    window.api.getSetting('normalize_target_lufs', String(DEFAULT_TARGET))
      .then(v => setTargetInput(v));
  }, []);

  const handleTargetChange = (raw) => {
    setTargetInput(raw);
    const num = Number(raw);
    if (Number.isFinite(num) && num >= -60 && num <= 0) {
      window.api.setSetting('normalize_target_lufs', raw);
    }
  };

  const sections = [
    { id: 'library', label: 'Library' },
  ];

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="settings-modal" onMouseDown={e => e.stopPropagation()}>

        <div className="settings-sidebar">
          <div className="settings-title">Settings</div>
          {sections.map(s => (
            <div
              key={s.id}
              className={`settings-nav-item${activeSection === s.id ? ' active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </div>
          ))}
        </div>

        <div className="settings-content">
          {activeSection === 'library' && (
            <>
              <h3>Library</h3>

              <div className="settings-group">
                <div className="settings-group-title">Loudness Normalization</div>
                <p className="settings-group-desc">
                  Calculates a gain adjustment for every analyzed track so it
                  hits the target loudness during playback. Tracks without
                  loudness data are skipped.
                </p>
                <div className="settings-row">
                  <label>Target loudness</label>
                  <div className="settings-input-row">
                    <input
                      type="number"
                      min="-30"
                      max="-6"
                      step="0.5"
                      value={targetInput}
                      onChange={e => handleTargetChange(e.target.value)}
                    />
                    <span className="settings-unit">LUFS</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <button className="settings-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

export default SettingsModal;

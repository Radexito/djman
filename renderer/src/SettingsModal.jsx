import { useState, useEffect } from 'react';
import './SettingsModal.css';

const DEFAULT_TARGET = -14;

function SettingsModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('library');

  // Library settings
  const [normalizeTarget, setNormalizeTarget] = useState(DEFAULT_TARGET);
  const [normalizeStatus, setNormalizeStatus] = useState('idle'); // idle | loading | done
  const [normalizeCount, setNormalizeCount] = useState(0);

  useEffect(() => {
    window.api.getSetting('normalize_target_lufs', String(DEFAULT_TARGET))
      .then(v => setNormalizeTarget(Number(v)));
  }, []);

  const handleNormalize = async () => {
    setNormalizeStatus('loading');
    const { updated } = await window.api.normalizeLibrary({ targetLufs: normalizeTarget });
    setNormalizeCount(updated);
    setNormalizeStatus('done');
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
                      value={normalizeTarget}
                      onChange={e => setNormalizeTarget(Number(e.target.value))}
                      disabled={normalizeStatus === 'loading'}
                    />
                    <span className="settings-unit">LUFS</span>
                  </div>
                </div>
                <div className="settings-action-row">
                  {normalizeStatus === 'done' && (
                    <span className="settings-success">
                      ✓ Updated {normalizeCount} track{normalizeCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    className="btn-primary"
                    onClick={handleNormalize}
                    disabled={normalizeStatus === 'loading'}
                  >
                    {normalizeStatus === 'loading' ? 'Normalizing…' : 'Normalize All'}
                  </button>
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

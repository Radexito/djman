import './HelpView.css';

const SECTIONS = [
  {
    title: 'Library management',
    items: [
      'Import tracks with the Import button in the sidebar, or Link to reference files without copying them into the library.',
      'Click a column header to sort; drag rows to reorder a playlist manually.',
      'Right-click a track (or a multi-selection) for options like Edit Details, Reset gain, Remove, and adding to playlists.',
      'Use the search bar for field-qualified queries, e.g. "BPM >= 120 AND KEY:12A GENRE is Psytrance".',
    ],
  },
  {
    title: 'Cue points & beat grid',
    items: [
      'Click a track\'s cue column (or use "Prepare Track" from the right-click menu) to open the Beat Grid Editor.',
      'Drag the waveform to nudge the beat grid; use the BPM field or TAP to set tempo manually.',
      'Add, rename, and delete hot cues and memory cues directly on the detail waveform.',
    ],
  },
  {
    title: 'Cloud search & downloads',
    items: [
      'Cloud Search looks up tracks across YouTube and TIDAL and lets you download matches straight into your library.',
      'YT-DLP and TIDAL each have a dedicated tab for downloading full playlists or albums, with per-track progress.',
      'TIDAL downloads require logging in once via the TIDAL tab — a link-code flow opens in your browser.',
    ],
  },
  {
    title: 'Playlists',
    items: [
      'Create playlists from the + button above the playlist list in the sidebar.',
      'Right-click a playlist to rename it, assign a color, export it (M3U or Rekordbox USB), or delete it.',
      'Drag tracks from the library onto a playlist in the sidebar to add them.',
    ],
  },
  {
    title: 'USB export (Rekordbox)',
    items: [
      'Export a single playlist or your entire library to a Rekordbox-compatible USB drive from the playlist context menu or the Export dialog.',
      'Only removable drives are offered as export targets — internal disks are never selectable, to prevent accidental overwrites.',
    ],
  },
];

export default function HelpView({ style }) {
  return (
    <div className="help-view" style={style}>
      <div className="help-view__inner">
        <h1 className="help-view__title">Help</h1>
        <p className="help-view__intro">
          A quick guide to DjManager's core features. This page will grow over time.
        </p>
        {SECTIONS.map((section) => (
          <section className="help-view__section" key={section.title}>
            <h2 className="help-view__section-title">{section.title}</h2>
            <ul className="help-view__list">
              {section.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

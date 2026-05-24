function ZoneCard({ zone, onSelect }) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: '#0d0d18',
        border: `1px solid ${zone.color}33`,
        borderLeft: `3px solid ${zone.color}`,
        borderRadius: 8,
        padding: '16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#eee', letterSpacing: 1 }}>
          {zone.name}
        </span>
        <span style={{
          fontSize: 8,
          color: zone.color,
          background: zone.color + '18',
          border: `1px solid ${zone.color}33`,
          borderRadius: 3,
          padding: '2px 6px',
          letterSpacing: 1,
        }}>
          {zone.nature.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#3a3a4a', lineHeight: 1.6 }}>
        {zone.description}
      </div>
      <div style={{ fontSize: 10, color: zone.color + 'aa', marginTop: 2 }}>
        Walk this route →
      </div>
    </div>
  );
}

export default function WorldScreen({ zones, onSelectZone, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', color: '#555',
            fontSize: 12, cursor: 'pointer', letterSpacing: 1, padding: 0,
          }}
        >
          ← Roster
        </button>
      </div>

      <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>CHOOSE ROUTE</div>

      {zones.map((zone) => (
        <ZoneCard key={zone.id} zone={zone} onSelect={() => onSelectZone(zone)} />
      ))}
    </div>
  );
}

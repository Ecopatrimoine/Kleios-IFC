// src/components/layout/Topbar.tsx
interface TopbarProps {
  title: string;
  onNewContact?: () => void;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  showSearch?: boolean;
  colorNavy: string;
  colorGold: string;
}

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="#8FAAB6" strokeWidth="1.5"/>
    <path d="M11 11l3 3" stroke="#8FAAB6" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const BellIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2a5 5 0 00-5 5v2l-1.5 2.5h13L13 9V7a5 5 0 00-5-5z" stroke="#5E7A88" strokeWidth="1.3"/>
    <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="#5E7A88" strokeWidth="1.3"/>
  </svg>
);

export function Topbar({ title, onNewContact, searchValue = "", onSearchChange, showSearch = true, colorNavy, colorGold }: TopbarProps) {
  return (
    <header style={{
      background: "rgba(237,232,223,0.97)",
      padding: "0 22px",
      height: 52,
      display: "flex",
      alignItems: "center",
      gap: 14,
      borderBottom: "1px solid rgba(11,48,64,0.10)",
      flexShrink: 0,
    }}>
      {/* Dot + titre */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: colorGold, flexShrink: 0 }} />
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "#0B3040", margin: 0 }}>{title}</h1>
      </div>

      {/* Recherche */}
      {showSearch && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.75)",
          border: "1px solid rgba(11,48,64,0.13)",
          borderRadius: 7, padding: "5px 12px", width: 220,
          transition: "border-color 0.15s",
        }}
          onFocus={() => {}} // handled by input
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchValue}
            onChange={e => onSearchChange?.(e.target.value)}
            style={{
              border: "none", background: "none", fontSize: 12.5,
              color: "#0B3040", outline: "none", fontFamily: "inherit", width: "100%",
            }}
          />
        </div>
      )}

      {/* Cloche */}
      <div style={{
        width: 30, height: 30, borderRadius: 7,
        border: "1px solid rgba(11,48,64,0.13)",
        background: "rgba(255,255,255,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", position: "relative",
      }}>
        <BellIcon />
        <div style={{
          width: 7, height: 7, background: colorGold, borderRadius: "50%",
          position: "absolute", top: 6, right: 6, border: "1.5px solid rgba(237,232,223,0.97)",
        }}/>
      </div>

      {/* Nouveau client */}
      {onNewContact && (
        <button onClick={onNewContact} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: colorNavy, color: "#fff",
          border: "none", borderRadius: 7,
          padding: "7px 14px", fontSize: 12, fontWeight: 500,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 2px 8px rgba(11,48,64,0.18)",
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Nouveau client
        </button>
      )}
    </header>
  );
}

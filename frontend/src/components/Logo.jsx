export default function Logo({ size = 40, showText = false, textSize = 22 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Background */}
        <rect width="40" height="40" rx="10" fill="#111118" />
        {/* Bottom glow */}
        <rect x="0" y="30" width="40" height="10" rx="0" fill="#c8ff00" opacity="0.07" />
        <rect x="0" y="34" width="40" height="6" rx="0" fill="#c8ff00" opacity="0.07" />
        <rect x="0" y="34" width="40" height="6" rx="6" fill="none" />

        {/* Letter B — vertical bar */}
        <rect x="11" y="10" width="3.5" height="20" rx="1.75" fill="#f0f0f0" />
        {/* Top cap */}
        <rect x="11" y="10" width="12" height="3.5" rx="1.75" fill="#f0f0f0" />
        {/* Top right bump */}
        <rect x="19.5" y="10" width="3.5" height="9.5" rx="1.75" fill="#f0f0f0" />
        {/* Middle bar — accent green */}
        <rect x="11" y="18" width="11" height="3.5" rx="1.75" fill="#c8ff00" />
        {/* Bottom right bump */}
        <rect x="18.5" y="18" width="3.5" height="12" rx="1.75" fill="#f0f0f0" />
        {/* Bottom cap */}
        <rect x="11" y="26.5" width="12" height="3.5" rx="1.75" fill="#f0f0f0" />

        {/* Green accent dot top-right */}
        <circle cx="31.5" cy="10.5" r="4" fill="#c8ff00" />
        <circle cx="31.5" cy="10.5" r="2" fill="#0a0a0f" />
      </svg>

      {showText && (
        <span style={{
          fontWeight: 800,
          fontSize: `${textSize}px`,
          letterSpacing: "-0.5px",
          fontFamily: "Syne, sans-serif",
        }}>
          BetLobby
        </span>
      )}
    </div>
  );
}

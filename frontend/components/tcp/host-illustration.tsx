export type ClientHostAppearance = "desktop" | "laptop";
export type ServerHostAppearance = "server-rack" | "desktop";

type HostIllustrationProps = {
  endpoint: "Client" | "Server";
  appearance: ClientHostAppearance | ServerHostAppearance;
};

export function HostIllustration({
  endpoint,
  appearance,
}: HostIllustrationProps) {
  const label = `${endpoint} endpoint illustrated as ${appearance.replace("-", " ")}`;

  return (
    <div
      className={`host-illustration host-${appearance}`}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 80 60" aria-hidden="true" focusable="false">
        {appearance === "laptop" ? (
          <>
            <rect x="16" y="10" width="48" height="32" rx="4" />
            <path d="M8 46h64l-5 6H13z" />
            <path className="host-screen" d="M22 16h36v20H22z" />
          </>
        ) : appearance === "server-rack" ? (
          <>
            <rect x="18" y="5" width="44" height="50" rx="5" />
            <path className="host-divider" d="M20 19h40M20 34h40" />
            <circle cx="27" cy="12" r="2" />
            <circle cx="27" cy="27" r="2" />
            <circle cx="27" cy="42" r="2" />
            <path className="host-bars" d="M34 12h18M34 27h18M34 42h18" />
          </>
        ) : (
          <>
            <rect x="13" y="7" width="54" height="35" rx="4" />
            <path className="host-screen" d="M19 13h42v23H19z" />
            <path d="M35 42h10v8h13v4H22v-4h13z" />
          </>
        )}
      </svg>
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

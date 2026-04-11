import ThemeToggle from "./ThemeToggle";
import vistaLogo from "@/assets/vista-logo.png";
import vistaLogoDark from "@/assets/vista-logo-dark.png";
import { useEffect, useState } from "react";

interface VistaHeaderProps {
  apiStatus?: "checking" | "online" | "offline";
}

const VistaHeader = ({ apiStatus = "checking" }: VistaHeaderProps) => {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const statusColor =
    apiStatus === "online"
      ? "bg-green-500"
      : apiStatus === "offline"
      ? "bg-red-500"
      : "bg-yellow-500";

  const statusLabel =
    apiStatus === "online"
      ? "Ready"
      : apiStatus === "offline"
      ? "Offline"
      : "Checking…";

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-card">
      <div className="flex items-center gap-2.5">
        <img
          src={isDark ? vistaLogoDark : vistaLogo}
          alt="VISTA logo"
          className="w-8 h-8"
          width={512}
          height={512}
        />
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            VISTA
          </h1>
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
            Voice-based Interpretation & Streaming Translation Architecture
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse`} />
          <span className="text-xs text-muted-foreground font-medium">{statusLabel}</span>
        </div>
      </div>
    </header>
  );
};

export default VistaHeader;
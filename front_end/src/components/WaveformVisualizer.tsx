interface WaveformVisualizerProps {
  isActive: boolean;
  recordingTime?: number;
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
    s % 60
  ).padStart(2, "0")}`;
}

const WaveformVisualizer = ({
  isActive,
  recordingTime = 0,
}: WaveformVisualizerProps) => {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-end gap-[3px] h-7">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full bg-destructive transition-all duration-150"
            style={{
              animation: `waveform 1s ease-in-out ${i * 0.15}s infinite`,
              height: "12px",
            }}
          />
        ))}
      </div>
      <span className="text-sm font-mono font-semibold text-destructive">
        {formatTime(recordingTime)}
      </span>
      <span className="text-xs text-muted-foreground">Live translating</span>
    </div>
  );
};

export default WaveformVisualizer;
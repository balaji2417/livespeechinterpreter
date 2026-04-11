import { Mic, Square } from "lucide-react";

interface MicButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

const MicButton = ({ isListening, onToggle }: MicButtonProps) => {
  return (
    <div className="relative flex items-center justify-center">
      {isListening && (
        <>
          <div className="absolute w-16 h-16 rounded-full bg-destructive/15 animate-pulse-ring" />
          <div
            className="absolute w-14 h-14 rounded-full bg-destructive/10 animate-pulse-ring"
            style={{ animationDelay: "0.4s" }}
          />
        </>
      )}
      <button
        onClick={onToggle}
        className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
          isListening
            ? "bg-destructive text-white shadow-lg shadow-destructive/30 animate-mic-pulse hover:bg-destructive/90"
            : "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95"
        }`}
      >
        {isListening ? (
          <Square className="w-5 h-5 fill-white" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

export default MicButton;
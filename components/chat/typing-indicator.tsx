export function TypingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-1" aria-label={label || "Advisor is typing"}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse-soft"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      {label && <span className="text-sm text-foreground/60">{label}</span>}
    </div>
  );
}

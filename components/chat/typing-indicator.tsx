export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Advisor is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary/80 animate-pulse-soft"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}

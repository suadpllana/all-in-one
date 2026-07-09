// Shared empty / error state blocks.

export function ErrorState({ error, onRetry, compact }) {
  const missingKey = error?.code === 'missing_key'
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center ${
        compact ? 'gap-2 p-6' : 'gap-3 p-10'
      }`}
    >
      <span className="text-3xl">{missingKey ? '🔑' : '⚠️'}</span>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">
        {error?.message || 'Something went wrong loading this content.'}
      </p>
      {!missingKey && onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-[var(--color-muted)]">{hint}</p>}
    </div>
  )
}

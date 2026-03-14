"use client"

const SUGGESTED_QUESTIONS = [
  "Give me a weekly team performance summary",
  "Which leads are at risk of going stale?",
  "Who's behind on follow-ups?",
  "Are there unassigned leads waiting in the pool?",
  "Who should I assign new leads to based on current workload?",
] as const

interface AgencySuggestedQuestionsProps {
  onSelect: (question: string) => void
  disabled?: boolean
}

export function AgencySuggestedQuestions({
  onSelect,
  disabled,
}: AgencySuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-[#d97706]/30 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  )
}

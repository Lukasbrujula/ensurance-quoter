"use client"

const SUGGESTED_QUESTIONS = [
  "Which carriers accept vapers as non-smokers?",
  "Best carriers for a client with DUI history?",
  "Compare term life rates for a healthy 30M, $500K 20yr",
  "What medical conditions does John Hancock accept?",
  "Which carriers operate in all 50 states?",
] as const

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-[#1773cf]/30 hover:bg-muted hover:text-foreground"
        >
          {question}
        </button>
      ))}
    </div>
  )
}

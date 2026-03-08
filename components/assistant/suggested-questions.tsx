"use client"

const SUGGESTED_QUESTIONS = [
  "I have a client who vapes — which carriers won't charge tobacco rates?",
  "My client has a DUI from 2 years ago. Who will write them?",
  "Compare rates for a healthy 35-year-old male in Texas, $500K 20-year term",
  "Client has Type 2 Diabetes and high blood pressure — which carriers should I avoid?",
  "Which carriers accept bipolar disorder?",
] as const

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-[#1773cf]/30 hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  )
}

"use client"

import { Sparkles, User, Database, BarChart3 } from "lucide-react"

type SourceType = "carrier-data" | "live-pricing" | "both" | null

interface ChatMessageProps {
  role: "user" | "assistant"
  content: string
  source?: SourceType
}

export function ChatMessage({ role, content, source }: ChatMessageProps) {
  const isUser = role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-[#1e293b] text-white"
            : "bg-[#eff6ff] text-[#1773cf] dark:bg-[#1773cf]/15"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[75%] ${isUser ? "text-right" : "text-left"}`}>
        <div
          className={`inline-block rounded-lg px-4 py-3 text-[14px] leading-relaxed ${
            isUser
              ? "bg-[#1773cf] text-white"
              : "bg-muted text-foreground"
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>

        {/* Source indicator for assistant messages */}
        {!isUser && source && (
          <div className="mt-1.5 flex items-center gap-3 px-1">
            {(source === "carrier-data" || source === "both") && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <Database className="h-3 w-3" />
                Carrier guides
              </span>
            )}
            {(source === "live-pricing" || source === "both") && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                <BarChart3 className="h-3 w-3" />
                Live pricing
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

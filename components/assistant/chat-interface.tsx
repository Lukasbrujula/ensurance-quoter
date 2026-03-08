"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Loader2, Sparkles } from "lucide-react"
import { ChatMessage } from "./chat-message"
import { SuggestedQuestions } from "./suggested-questions"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Mock assistant response (replaced in UA-02 with real AI)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          "I'm the Ensurance Underwriting Assistant. AI integration coming soon!",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 800)
  }, [inputValue, isLoading])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleSuggestedSelect = useCallback((question: string) => {
    setInputValue(question)
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      handleSend()
    },
    [handleSend],
  )

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 md:py-24">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#eff6ff] dark:bg-[#1773cf]/15">
                <Sparkles className="h-6 w-6 text-[#1773cf]" />
              </div>
              <h1 className="text-center text-[22px] font-bold tracking-tight text-foreground md:text-[26px]">
                Underwriting Assistant
              </h1>
              <p className="mt-2 max-w-md text-center text-[14px] leading-relaxed text-muted-foreground">
                Ask anything about carriers, underwriting rules, or pricing.
                Powered by real carrier intelligence data.
              </p>
              <div className="mt-8 w-full max-w-xl">
                <SuggestedQuestions onSelect={handleSuggestedSelect} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1773cf] dark:bg-[#1773cf]/15">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#1773cf]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-4 md:px-6">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about carriers, underwriting rules, or pricing..."
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-lg border border-border bg-muted px-4 py-3 pr-12 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-[#1773cf]/40 focus:outline-none focus:ring-1 focus:ring-[#1773cf]/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute bottom-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-[#1773cf] text-white transition-colors hover:bg-[#1565b8] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
            Ensurance AI uses carrier intelligence data. Always verify with the
            carrier before binding coverage.
          </p>
        </div>
      </div>
    </div>
  )
}

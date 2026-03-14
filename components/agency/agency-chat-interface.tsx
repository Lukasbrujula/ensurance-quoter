"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  Send,
  Loader2,
  BarChart3,
  AlertCircle,
  RotateCcw,
  User,
  BrainCircuit,
} from "lucide-react"
import { AgencySuggestedQuestions } from "./agency-suggested-questions"

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("")
}

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool"
}

export function AgencyChatInterface() {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agency/chat" }),
    [],
  )

  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport,
  })

  const isBusy = status === "submitted" || status === "streaming"

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = useCallback(() => {
    const text = inputValue.trim()
    if (!text || isBusy) return
    setInputValue("")
    sendMessage({ text })
  }, [inputValue, isBusy, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleSuggestedSelect = useCallback(
    (question: string) => {
      if (isBusy) return
      sendMessage({ text: question })
    },
    [isBusy, sendMessage],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      handleSend()
    },
    [handleSend],
  )

  const handleRetry = useCallback(() => {
    regenerate()
  }, [regenerate])

  const isToolRunning =
    status === "streaming" &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].parts.some(
      (part) =>
        isToolPart(part) &&
        "state" in part &&
        part.state !== "output-available",
    )

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 md:py-24">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fef3c7] dark:bg-[#d97706]/15">
                <BrainCircuit className="h-7 w-7 text-[#d97706]" />
              </div>
              <h1 className="text-center text-[22px] font-bold tracking-tight text-foreground md:text-[26px]">
                Agency Manager
              </h1>
              <p className="mt-2 max-w-md text-center text-[14px] leading-relaxed text-muted-foreground">
                Your AI operations advisor. Ask about team performance, lead
                distribution, follow-up accountability, and more.
              </p>
              <p className="mt-1 text-center text-[12px] text-muted-foreground/50">
                Powered by real-time agency data
              </p>
              <div className="mt-8 w-full max-w-xl">
                <AgencySuggestedQuestions
                  onSelect={handleSuggestedSelect}
                  disabled={isBusy}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => {
                const text = getMessageText(message)
                if (!text) return null
                const isUser = message.role === "user"
                const hasToolCall = message.parts.some(isToolPart)
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isUser
                          ? "bg-[#1e293b] text-white"
                          : "bg-[#fef3c7] text-[#d97706] dark:bg-[#d97706]/15"
                      }`}
                    >
                      {isUser ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <BrainCircuit className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] ${isUser ? "text-right" : "text-left"}`}
                    >
                      <div
                        className={`inline-block rounded-lg px-4 py-3 text-[14px] leading-relaxed ${
                          isUser
                            ? "bg-[#d97706] text-white"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{text}</p>
                      </div>
                      {!isUser && hasToolCall && (
                        <div className="mt-1.5 flex items-center gap-1 px-1">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                            <BarChart3 className="h-3 w-3" />
                            Live data
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {status === "submitted" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[#d97706] dark:bg-[#d97706]/15">
                    <BrainCircuit className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#d97706]" />
                  </div>
                </div>
              )}

              {isToolRunning && (
                <div className="ml-11 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Querying agency data...
                </div>
              )}

              {error && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex max-w-[75%] flex-col gap-2">
                    <div className="inline-block rounded-lg bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      Something went wrong. Please try again.
                    </div>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </button>
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
              placeholder="Ask about team performance, leads, or follow-ups..."
              rows={1}
              disabled={isBusy}
              className="w-full resize-none rounded-lg border border-border bg-muted px-4 py-3 pr-12 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-[#d97706]/40 focus:outline-none focus:ring-1 focus:ring-[#d97706]/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isBusy}
              className="absolute bottom-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-[#d97706] text-white transition-colors hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground/50">
            Agency Manager uses real-time data from your team. Always verify
            before making staffing decisions.
          </p>
        </div>
      </div>
    </div>
  )
}

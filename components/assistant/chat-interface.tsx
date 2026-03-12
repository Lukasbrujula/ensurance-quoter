"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { Send, Loader2, Sparkles, AlertCircle, RotateCcw } from "lucide-react"
import { ChatMessage } from "./chat-message"
import { SuggestedQuestions } from "./suggested-questions"

type SourceType = "carrier-data" | "live-pricing" | "both" | null

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool"
}

function detectSource(message: UIMessage): SourceType {
  const hasToolCall = message.parts.some(isToolPart)
  const text = getMessageText(message)
  const hasPricingContent = /\$[\d,]+(\.\d{2})?/.test(text) && hasToolCall

  if (hasPricingContent && text.length > 200) return "both"
  if (hasToolCall) return "live-pricing"
  if (text.length > 50) return "carrier-data"
  return null
}

export function ChatInterface() {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/assistant/chat" }),
    [],
  )

  const { messages, sendMessage, status, error, regenerate } = useChat({ transport })

  const isBusy = status === "submitted" || status === "streaming"

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

  // Detect if the assistant is currently running a tool call
  const isToolRunning = status === "streaming" && messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].parts.some(
      (part) => isToolPart(part) && "state" in part && part.state !== "output-available"
    )

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 md:py-24">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eff6ff] dark:bg-[#1773cf]/15">
                <Sparkles className="h-7 w-7 text-[#1773cf]" />
              </div>
              <h1 className="text-center text-[22px] font-bold tracking-tight text-foreground md:text-[26px]">
                Underwriting Assistant
              </h1>
              <p className="mt-2 max-w-md text-center text-[14px] leading-relaxed text-muted-foreground">
                Your AI-powered underwriting expert. Ask about carriers, medical
                conditions, tobacco rules, pricing, or anything else.
              </p>
              <p className="mt-1 text-center text-[12px] text-muted-foreground/50">
                Powered by 84+ carrier guides and real-time Compulife pricing
              </p>
              <div className="mt-8 w-full max-w-xl">
                <SuggestedQuestions
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
                return (
                  <ChatMessage
                    key={message.id}
                    role={message.role as "user" | "assistant"}
                    content={text}
                    source={
                      message.role === "assistant"
                        ? detectSource(message)
                        : undefined
                    }
                  />
                )
              })}

              {/* Loading: waiting for response */}
              {status === "submitted" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#1773cf] dark:bg-[#1773cf]/15">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#1773cf]" />
                  </div>
                </div>
              )}

              {/* Loading: fetching pricing via tool call */}
              {isToolRunning && (
                <div className="ml-11 flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Fetching live pricing from Compulife...
                </div>
              )}

              {/* Error state */}
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
              placeholder="Ask about carriers, underwriting rules, or pricing..."
              rows={1}
              disabled={isBusy}
              className="w-full resize-none rounded-lg border border-border bg-muted px-4 py-3 pr-12 text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:border-[#1773cf]/40 focus:outline-none focus:ring-1 focus:ring-[#1773cf]/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isBusy}
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

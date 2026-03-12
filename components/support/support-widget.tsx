"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { MessageCircleQuestion, X, Send, Mail } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const PUBLIC_PATH_PREFIXES = ["/auth"]
const PUBLIC_PATHS = ["/"]

function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const { isSignedIn } = useAuth()

  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        handleClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, handleClose])

  // Close panel on route change
  useEffect(() => {
    handleClose()
  }, [pathname, handleClose])

  if (!isSignedIn || isPublicPage(pathname)) return null

  function handleSend() {
    toast("Support coming soon — email support@ensurance.com for now")
    setEmail("")
    setMessage("")
    handleClose()
  }

  return (
    <>
      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed bottom-20 right-6 z-50 w-80 origin-bottom-right transition-all duration-200",
          open
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        <Card className="shadow-xl border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <h3 className="text-base font-semibold tracking-tight">Support</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </CardHeader>

          <CardContent className="space-y-4 px-5 pb-5">
            <p className="text-sm text-muted-foreground">
              Need help? We&apos;re here for you.
            </p>

            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Textarea
                placeholder="Describe your issue..."
                rows={4}
                className="resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full cursor-pointer"
                onClick={handleSend}
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>

              <a
                href="mailto:support@ensurance.com"
                className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" />
                Or email support@ensurance.com directly
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "cursor-pointer transition-transform duration-150 hover:scale-110",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
        aria-label={open ? "Close support" : "Open support"}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircleQuestion className="h-5 w-5" />
        )}
      </button>
    </>
  )
}

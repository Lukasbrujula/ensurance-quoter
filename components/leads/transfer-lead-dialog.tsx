"use client"

import { useState, useCallback, useEffect } from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { ArrowRightLeft, Loader2, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface OrgMember {
  userId: string
  name: string
  role: string | null
}

interface TransferLeadDialogProps {
  leadId: string
  leadName: string
  currentAgentId: string | null
  onTransferred: (newAgentId: string) => void
}

/**
 * Transfer dialog for passing a lead to another org member.
 *
 * Visible when:
 * - User is in an org (orgId present)
 * - Lead has an orgId (team lead)
 * - User owns the lead OR user is admin
 *
 * Caller is responsible for visibility logic via shouldShow.
 */
export function TransferLeadDialog({
  leadId,
  leadName,
  currentAgentId,
  onTransferred,
}: TransferLeadDialogProps) {
  const { userId, orgId } = useAuth()
  const { memberships } = useOrganization({
    memberships: { pageSize: 100 },
  })

  const [open, setOpen] = useState(false)
  const [targetAgentId, setTargetAgentId] = useState("")
  const [reason, setReason] = useState("")
  const [isTransferring, setIsTransferring] = useState(false)
  const [members, setMembers] = useState<OrgMember[]>([])

  // Build member list, excluding current owner
  useEffect(() => {
    if (!memberships?.data) return

    const mapped: OrgMember[] = memberships.data
      .map((m) => ({
        userId: m.publicUserData?.userId ?? "",
        name: [m.publicUserData?.firstName, m.publicUserData?.lastName]
          .filter(Boolean)
          .join(" ") || m.publicUserData?.identifier || "Unknown",
        role: m.role,
      }))
      .filter((m) => m.userId && m.userId !== currentAgentId)

    setMembers(mapped)
  }, [memberships?.data, currentAgentId])

  // Don't render for solo agents
  if (!orgId || !userId) return null

  const handleTransfer = useCallback(async () => {
    if (!targetAgentId) {
      toast.error("Select an agent to transfer to")
      return
    }

    setIsTransferring(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAgentId,
          reason: reason.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to transfer lead")
      }

      const targetMember = members.find((m) => m.userId === targetAgentId)
      toast.success(`Lead transferred to ${targetMember?.name ?? "agent"}`)
      onTransferred(targetAgentId)
      setOpen(false)
      setTargetAgentId("")
      setReason("")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to transfer lead",
      )
    } finally {
      setIsTransferring(false)
    }
  }, [leadId, targetAgentId, reason, members, onTransferred])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-[11px]"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Transfer Lead</DialogTitle>
          <DialogDescription>
            Transfer <span className="font-medium text-foreground">{leadName}</span> to
            another team member. This takes effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="target-agent">Transfer to</Label>
            <Select value={targetAgentId} onValueChange={setTargetAgentId}>
              <SelectTrigger id="target-agent">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    <span className="flex items-center gap-1.5">
                      <UserCircle className="h-3.5 w-3.5 text-[#64748b]" />
                      {member.name}
                      {member.role === "org:admin" && (
                        <span className="text-[10px] text-[#94a3b8]">(Admin)</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
                {members.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    No other team members
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transfer-reason">
              Reason <span className="text-[11px] text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="transfer-reason"
              placeholder="e.g., Client needs an agent licensed in Florida"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isTransferring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!targetAgentId || isTransferring}
          >
            {isTransferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer Lead
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { MappedLead, ImportResult } from "@/lib/utils/csv-parser"

interface ImportPreviewProps {
  result: ImportResult
}

const PREVIEW_LIMIT = 5

const COLUMNS: { key: keyof MappedLead; label: string }[] = [
  { key: "firstName", label: "First" },
  { key: "lastName", label: "Last" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "state", label: "State" },
  { key: "age", label: "Age" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "DOB" },
  { key: "city", label: "City" },
  { key: "zipCode", label: "Zip" },
  { key: "maritalStatus", label: "Marital" },
  { key: "occupation", label: "Occupation" },
  { key: "incomeRange", label: "Income" },
]

export function ImportPreview({ result }: ImportPreviewProps) {
  const preview = result.leads.slice(0, PREVIEW_LIMIT)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default">{result.leads.length} leads ready</Badge>
        {result.skipped.length > 0 && (
          <Badge variant="secondary">
            {result.skipped.length} skipped
          </Badge>
        )}
        {result.duplicateEmails.length > 0 && (
          <Badge variant="outline">
            {result.duplicateEmails.length} duplicate emails
          </Badge>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              {COLUMNS.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((lead, i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                {COLUMNS.map((col) => (
                  <TableCell key={col.key} className="max-w-[150px] truncate">
                    {String(lead[col.key] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {result.leads.length > PREVIEW_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing {PREVIEW_LIMIT} of {result.leads.length} rows
        </p>
      )}

      {result.skipped.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            {result.skipped.length} skipped rows
          </summary>
          <ul className="mt-1 space-y-0.5 pl-4">
            {result.skipped.slice(0, 10).map((s) => (
              <li key={s.row}>
                Row {s.row}: {s.reason}
              </li>
            ))}
            {result.skipped.length > 10 && (
              <li>...and {result.skipped.length - 10} more</li>
            )}
          </ul>
        </details>
      )}
    </div>
  )
}

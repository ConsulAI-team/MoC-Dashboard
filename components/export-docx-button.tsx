"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { generateDocx, type DigestData } from "@/lib/docx-generator"
import { saveAs } from "file-saver"

interface ExportDocxButtonProps {
  data: DigestData
  className?: string
}

export function ExportDocxButton({ data, className }: ExportDocxButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await generateDocx(data)
      const dateStr = data.generatedAt
        ? new Date(data.generatedAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
      saveAs(blob, `MoC-Daily-Digest-${dateStr}.docx`)
    } catch (error) {
      console.error("Failed to export DOCX:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      className={className}
      variant="default"
    >
      {isExporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          Export DOCX
        </>
      )}
    </Button>
  )
}

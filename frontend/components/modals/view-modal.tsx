"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ViewModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  data: Record<string, any>
  fields: Array<{
    key: string
    label: string
    type?: "text" | "date" | "currency" | "badge" | "status"
    badgeVariant?: "default" | "secondary" | "destructive" | "outline"
  }>
}

export function ViewModal({ isOpen, onClose, title, data, fields }: ViewModalProps) {
  const formatValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return "N/A"
    
    switch (type) {
      case "date":
        return new Date(value).toLocaleDateString()
      case "currency":
        return `$${Number(value).toFixed(2)}`
      case "badge":
        const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value
        return (
          <Badge variant="outline" className="text-xs">
            {displayValue}
          </Badge>
        )
      case "status":
        const statusColors = {
          active: "bg-green-600",
          inactive: "bg-gray-600",
          pending: "bg-yellow-600",
          approved: "bg-green-600",
          rejected: "bg-red-600",
          success: "bg-green-600",
          failed: "bg-red-600",
        }
        return (
          <Badge 
            variant="default" 
            className={`text-xs ${statusColors[value as keyof typeof statusColors] || "bg-gray-600"}`}
          >
            {value}
          </Badge>
        )
      default:
        return String(value)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="grid grid-cols-3 gap-4">
              <div className="font-medium text-slate-700">
                {field.label}:
              </div>
              <div className="col-span-2">
                {formatValue(data[field.key], field.type)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

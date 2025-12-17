"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Save } from "lucide-react"

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Record<string, any>) => void
  title: string
  data: Record<string, any>
  fields: Array<{
    key: string
    label: string
    type: "text" | "email" | "number" | "select" | "textarea" | "switch" | "date"
    options?: Array<{ value: string; label: string }>
    required?: boolean
  }>
}

export function EditModal({ isOpen, onClose, onSave, title, data, fields }: EditModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>(data)

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  const renderField = (field: any) => {
    const value = formData[field.key] || ""

    switch (field.type) {
      case "select":
        return (
          <Select value={value} onValueChange={(val) => handleInputChange(field.key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: { value: string; label: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case "textarea":
        return (
          <Textarea
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label}`}
            rows={3}
          />
        )
      
      case "switch":
        return (
          <Switch
            checked={value}
            onCheckedChange={(checked) => handleInputChange(field.key, checked)}
          />
        )
      
      case "date":
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
          />
        )
      
      default:
        return (
          <Input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            placeholder={`Enter ${field.label}`}
            required={field.required}
          />
        )
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
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

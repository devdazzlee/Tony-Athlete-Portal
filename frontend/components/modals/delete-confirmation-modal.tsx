"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

export interface DeleteConfirmationModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;
  /**
   * Callback when the user confirms the deletion
   */
  onConfirm: () => void | Promise<void>;
  /**
   * Title of the modal (e.g., "Delete Website?")
   */
  title?: string;
  /**
   * Main message/description to display
   */
  message?: string;
  /**
   * Optional: Name of the item being deleted (displayed prominently)
   */
  itemName?: string;
  /**
   * Optional: Additional description or warning
   */
  description?: string;
  /**
   * Whether the delete operation is in progress
   */
  isLoading?: boolean;
  /**
   * Optional: Custom confirm button text (default: "Delete")
   */
  confirmText?: string;
  /**
   * Optional: Custom cancel button text (default: "Cancel")
   */
  cancelText?: string;
  /**
   * Optional: Custom variant for destructive actions
   */
  variant?: "default" | "destructive";
}

/**
 * Reusable Delete Confirmation Modal Component
 *
 * A professional, accessible modal for confirming delete operations.
 * Uses AlertDialog for better UX and accessibility.
 *
 * @example
 * ```tsx
 * const [deleteModal, setDeleteModal] = useState<{
 *   isOpen: boolean;
 *   itemId: string | null;
 *   itemName: string | null;
 * }>({ isOpen: false, itemId: null, itemName: null });
 *
 * <DeleteConfirmationModal
 *   isOpen={deleteModal.isOpen}
 *   onClose={() => setDeleteModal({ isOpen: false, itemId: null, itemName: null })}
 *   onConfirm={async () => {
 *     await handleDelete(deleteModal.itemId!);
 *     setDeleteModal({ isOpen: false, itemId: null, itemName: null });
 *   }}
 *   title="Delete Website?"
 *   message="Are you sure you want to delete this website?"
 *   itemName={deleteModal.itemName || undefined}
 *   description="This action cannot be undone. All associated data will be permanently removed."
 *   isLoading={isDeleting}
 * />
 * ```
 */
export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Item?",
  message = "Are you sure you want to delete this item?",
  itemName,
  description,
  isLoading = false,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "destructive",
}: DeleteConfirmationModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Delete confirmation error:", error);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{message}</p>

              {itemName && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="font-medium text-red-900">
                    {itemName}
                  </p>
                </div>
              )}

              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}

              {!description && (
                <p className="text-sm font-medium text-red-600">
                  This action cannot be undone.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === "destructive"
                ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
                : ""
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {confirmText}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

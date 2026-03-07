"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TypingTextForm } from "./typing-text-form";
import { ITypingText } from "@/types";
import { Plus, Edit3 } from "lucide-react";

interface TypingTextModalProps {
  /** Controls modal open/closed state */
  open: boolean;
  /** Called when modal should be closed */
  onOpenChange: (open: boolean) => void;
  /** Existing text data for editing, undefined for creating new */
  initialData?: ITypingText & { documentyId?: string };
  /** Called when form is submitted successfully */
  onSuccess?: (data: ITypingText) => void;
}

export function TypingTextModal({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: Readonly<TypingTextModalProps>) {
  // More robust editing detection - check for any identifier or meaningful data
  const isEditing = !!(
    initialData?.documentId ||
    (initialData &&
      Object.keys(initialData).length > 0 &&
      (initialData.text || initialData.type))
  );

  const handleSuccess = (data: ITypingText) => {
    onSuccess?.(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {isEditing ? (
              <>
                <Edit3 className="h-5 w-5" />
                Edit Typing Text
              </>
            ) : (
              <>Create New Typing Text</>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing
              ? "Update the typing text content and settings below."
              : "Create a new typing text for practice or test assessments."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <TypingTextForm
            initialData={initialData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

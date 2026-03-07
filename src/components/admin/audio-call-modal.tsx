"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AudioCallForm } from './index';
import { IAudioCall } from '@/types';
import { Plus, Edit3 } from 'lucide-react';

interface AudioCallModalProps {
  /** Controls modal open/closed state */
  readonly open: boolean;
  /** Called when modal should be closed */
  readonly onOpenChange: (open: boolean) => void;
  /** Existing audio call data for editing, undefined for creating new */
  readonly initialData?: IAudioCall & { documentId?: string };
  /** Called when form is submitted successfully */
  readonly onSuccess?: (data: IAudioCall) => void;
}

export function AudioCallModal({ 
  open, 
  onOpenChange, 
  initialData, 
  onSuccess 
}: AudioCallModalProps) {
  // More robust editing detection - check for any identifier or meaningful data
  const isEditing = !!(initialData?.documentId || initialData?.id || (initialData && Object.keys(initialData).length > 0 && (initialData.file?.url || initialData.description)));

  const handleSuccess = (data: IAudioCall) => {
    onSuccess?.(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {isEditing ? (
              <>
                <Edit3 className="h-5 w-5" />
                Edit Audio Call
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Upload New Audio Call
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the audio call information, file, transcription, and evaluation below.'
              : 'Upload a new emergency call audio recording with call details, transcription and optional evaluation.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AudioCallForm
            initialData={initialData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

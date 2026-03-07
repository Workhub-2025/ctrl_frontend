'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QuestionForm } from './index';
import { IQuestion } from '@/types';
import { Plus, Edit3 } from 'lucide-react';

interface QuestionModalProps {
  /** Controls modal open/closed state */
  open: boolean;
  /** Called when modal should be closed */
  onOpenChange: (open: boolean) => void;
  /** Existing question data for editing, undefined for creating new */
  initialData?: IQuestion & { documentId?: string };
  /** Called when form is submitted successfully */
  onSuccess?: (data: IQuestion) => void;
}

export function QuestionModal({ 
  open, 
  onOpenChange, 
  initialData, 
  onSuccess 
}: Readonly<QuestionModalProps>) {
  // More robust editing detection - check for any identifier or meaningful data
  const isEditing = !!(initialData?.documentId || (initialData && Object.keys(initialData).length > 0 && (initialData.question || initialData.type)));

  const handleSuccess = (data: IQuestion) => {
    onSuccess?.(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit3 className="h-5 w-5" />
                Edit Question
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create New Question
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the question content and answers below.'
              : 'Create a new question for multiple choice or text response assessments.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <QuestionForm
            initialData={initialData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
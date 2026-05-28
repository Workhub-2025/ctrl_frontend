"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Save, X } from "lucide-react";
import { ITypingText } from "@/types";
import {
  createTypingText,
  updateTypingText,
} from "@/app/actions/texts.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TypingTextFormProps {
  /** Existing text data for editing, undefined for creating new */
  readonly initialData?: ITypingText & { documentId?: string };
  /** Called when form is submitted successfully */
  readonly onSuccess?: (data: ITypingText) => void;
  /** Called when form is cancelled */
  readonly onCancel?: () => void;
  /** Additional CSS classes */
  readonly className?: string;
}

interface FormData {
  text: string;
  type: "practice" | "test";
  difficulty: "Base" | "Intermediate" | "Advanced";
}

interface FormErrors {
  text?: string;
  type?: string;
  difficulty?: string;
  general?: string;
}

export function TypingTextForm({
  initialData,
  onSuccess,
  onCancel,
  className = "",
}: TypingTextFormProps) {
  // More robust editing detection - check for any identifier
  const isEditing = !!(
    initialData?.documentId ||
    (initialData &&
      Object.keys(initialData).length > 0 &&
      (initialData.text || initialData.type))
  );

  // Form state
  const [formData, setFormData] = useState<FormData>({
    text: initialData?.text || "",
    type: initialData?.type || "practice",
    difficulty: initialData?.difficulty || "Base",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.text.trim()) {
      newErrors.text = "Text content is required";
    } else if (formData.text.trim().length < 10) {
      newErrors.text = "Text must be at least 10 characters long";
    } else if (formData.text.trim().length > 5000) {
      newErrors.text = "Text must be less than 5000 characters";
    }

    if (!formData.type) {
      newErrors.type = "Text type is required";
    }

    if (!formData.difficulty) {
      newErrors.difficulty = "Difficulty is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      try {
        let result;

        if (isEditing) {
          // Try to get the ID from documentId first, then fallback to other possible ID fields
          console.log("[Typing text form] initialData: ", initialData);

          const { documentId } = initialData;

          console.log("[Typing text form] documentId: ", documentId);

          if (!documentId) {
            setErrors({ general: "No valid ID found for updating this text" });
            return;
          }

          result = await updateTypingText(documentId, {
            text: formData.text.trim(),
            type: formData.type,
            difficulty: formData.difficulty,
          });
        } else {
          result = await createTypingText({
            text: formData.text.trim(),
            type: formData.type,
            difficulty: formData.difficulty,
          });
        }

        if (result.success && result.data) {
          onSuccess?.(result.data);
          // Reset form if creating new
          if (!isEditing) {
            setFormData({ text: "", type: "practice", difficulty: "Base" });
          }
        } else {
          setErrors({ general: result.error || "An error occurred" });
        }
      } catch (error) {
        console.error("Form submission error:", error);
        setErrors({
          general:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      }
    });
  };

  const handleCancel = () => {
    setFormData({
      text: initialData?.text || "",
      type: initialData?.type || "practice",
      difficulty: initialData?.difficulty || "Base",
    });
    setErrors({});
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* General Error Alert */}
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {/* Text Content Field */}
      <div className="space-y-2">
        <Label
          htmlFor="text"
          className="text-sm font-medium text-foreground"
        >
          Text Content *
        </Label>
        <Textarea
          id="text"
          placeholder="Enter the text content for the typing test..."
          value={formData.text}
          onChange={(e) => handleInputChange("text", e.target.value)}
          className={`min-h-[120px] resize-vertical ${
            errors.text ? "border-red-500" : ""
          }`}
          disabled={isPending}
          maxLength={5000}
        />
        <div className="flex justify-between items-center">
          {errors.text && <p className="text-sm text-red-600">{errors.text}</p>}
          <p className="text-sm text-muted-foreground ml-auto">
            {formData.text.length}/5000 characters
          </p>
        </div>
      </div>

      {/* Type Field */}
      <div className="space-y-2">
        <Label
          htmlFor="type"
          className="text-sm font-medium text-foreground"
        >
          Text Type *
        </Label>
        <Select
          value={formData.type}
          onValueChange={(value: "practice" | "test") =>
            handleInputChange("type", value)
          }
          disabled={isPending}
        >
          <SelectTrigger
            className={`text-foreground font-bold${
              errors.type ? "border-red-500" : ""
            }`}
          >
            <SelectValue placeholder="Select text type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="practice">Practice</SelectItem>
            <SelectItem value="test">Test</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && <p className="text-sm text-red-600">{errors.type}</p>}
        <p className="text-sm text-muted-foreground">
          Practice texts are for training, test texts are for formal assessments
        </p>
      </div>

      {/* Difficulty Field */}
      <div className="space-y-2">
        <Label
          htmlFor="difficulty"
          className="text-sm font-medium text-foreground"
        >
          Difficulty *
        </Label>
        <Select
          value={formData.difficulty}
          onValueChange={(value: "Base" | "Intermediate" | "Advanced") =>
            handleInputChange("difficulty", value)
          }
          disabled={isPending}
        >
          <SelectTrigger
            className={`text-foreground font-bold${
              errors.difficulty ? "border-red-500" : ""
            }`}
          >
            <SelectValue placeholder="Select difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Base">Base</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        {errors.difficulty && <p className="text-sm text-red-600">{errors.difficulty}</p>}
        <p className="text-sm text-muted-foreground">
          Each difficulty should have one practice text and three assessment texts.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 title-adaptive">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
          className="btn-outline-fix border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="btn-outline-fix border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          <Save className="h-4 w-4 mr-2" />
          {(() => {
            if (isPending) {
              return isEditing ? "Updating..." : "Creating...";
            }
            return isEditing ? "Update Text" : "Create Text";
          })()}
        </Button>
      </div>
    </form>
  );
}

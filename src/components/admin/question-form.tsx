'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Save, X } from 'lucide-react';
import { IQuestion, isMCPQuestion, isTextQuestion } from '@/types';
import { createQuestionAction, updateQuestionAction } from '@/app/actions/question.actions';
import { Alert, AlertDescription } from '@/components/ui/alert';

type CreateQuestionData = IQuestion;
type QuestionUpdateData = IQuestion;

interface QuestionFormProps {
  /** Existing question data for editing, undefined for creating new */
  readonly initialData?: IQuestion & { documentId?: string };
  /** Called when form is submitted successfully */
  readonly onSuccess?: (data: IQuestion) => void;
  /** Called when form is cancelled */
  readonly onCancel?: () => void;
  /** Additional CSS classes */
  readonly className?: string;
}

interface MCPFormData {
  type: 'mcp';
  question: string;
  rightAnswer: string;
  wrongAnswer1: string;
  wrongAnswer2: string;
  wrongAnswer3: string;
}

interface TextFormData {
  type: 'text';
  question: string;
  rubric: string;
}

type FormData = MCPFormData | TextFormData;

interface FormErrors {
  question?: string;
  rightAnswer?: string;
  wrongAnswer1?: string;
  wrongAnswer2?: string;
  wrongAnswer3?: string;
  rubric?: string;
  type?: string;
  general?: string;
}

export function QuestionForm({ 
  initialData, 
  onSuccess, 
  onCancel, 
  className = '' 
}: QuestionFormProps) {
  // More robust editing detection - check for any identifier
  const isEditing = !!(initialData?.documentId || (initialData && Object.keys(initialData).length > 0 && (initialData.question || initialData.type)));
  
  // Form state
  const [formData, setFormData] = useState<FormData>(() => {
    if (initialData && isMCPQuestion(initialData)) {
      return {
        type: 'mcp',
        question: initialData.question || '',
        rightAnswer: initialData.rightAnswer || '',
        wrongAnswer1: initialData.wrongAnswer1 || '',
        wrongAnswer2: initialData.wrongAnswer2 || '',
        wrongAnswer3: initialData.wrongAnswer3 || '',
      };
    } else if (initialData && isTextQuestion(initialData)) {
      return {
        type: 'text',
        question: initialData.question || '',
        rubric: initialData.rubric || '',
      };
    } else {
      return {
        type: 'mcp',
        question: '',
        rightAnswer: '',
        wrongAnswer1: '',
        wrongAnswer2: '',
        wrongAnswer3: '',
      };
    }
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();

  // Reset form when question type changes
  useEffect(() => {
    if (!isEditing && formData.type) {
      if (formData.type === 'mcp') {
        setFormData(prev => ({
          type: 'mcp',
          question: prev.question,
          rightAnswer: '',
          wrongAnswer1: '',
          wrongAnswer2: '',
          wrongAnswer3: '',
        }));
      } else {
        setFormData(prev => ({
          type: 'text',
          question: prev.question,
          rubric: '',
        }));
      }
      setErrors({});
    }
  }, [formData.type, isEditing]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Question text is required';
    } else if (formData.question.trim().length < 5) {
      newErrors.question = 'Question must be at least 5 characters long';
    } else if (formData.question.trim().length > 1000) {
      newErrors.question = 'Question must be less than 1000 characters';
    }

    if (!formData.type) {
      newErrors.type = 'Question type is required';
    }

    if (formData.type === 'mcp') {
      const mcpData = formData;
      if (!mcpData.rightAnswer.trim()) {
        newErrors.rightAnswer = 'Correct answer is required';
      } else if (mcpData.rightAnswer.trim().length > 500) {
        newErrors.rightAnswer = 'Answer must be less than 500 characters';
      }

      // Validate wrong answers (optional but check length if provided)
      if (mcpData.wrongAnswer1.trim() && mcpData.wrongAnswer1.trim().length > 500) {
        newErrors.wrongAnswer1 = 'Answer must be less than 500 characters';
      }
      if (mcpData.wrongAnswer2.trim() && mcpData.wrongAnswer2.trim().length > 500) {
        newErrors.wrongAnswer2 = 'Answer must be less than 500 characters';
      }
      if (mcpData.wrongAnswer3.trim() && mcpData.wrongAnswer3.trim().length > 500) {
        newErrors.wrongAnswer3 = 'Answer must be less than 500 characters';
      }
    } else if (formData.type === 'text') {
      const textData = formData;
      if (textData.rubric.trim() && textData.rubric.trim().length > 2000) {
        newErrors.rubric = 'Rubric must be less than 2000 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTypeChange = (newType: 'mcp' | 'text') => {
    const currentQuestion = formData.question;
    
    if (newType === 'mcp') {
      setFormData({
        type: 'mcp',
        question: currentQuestion,
        rightAnswer: '',
        wrongAnswer1: '',
        wrongAnswer2: '',
        wrongAnswer3: '',
      });
    } else {
      setFormData({
        type: 'text',
        question: currentQuestion,
        rubric: '',
      });
    }
    
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }    

    startTransition(async () => {
      try {
        let result;
        let requestData: CreateQuestionData | QuestionUpdateData;

        // Prepare data based on question type
        if (formData.type === 'mcp') {
          const mcpData = formData;
          requestData = {
            type: 'mcp',
            question: mcpData.question.trim(),
            rightAnswer: mcpData.rightAnswer.trim(),
            ...(mcpData.wrongAnswer1.trim() && { wrongAnswer1: mcpData.wrongAnswer1.trim() }),
            ...(mcpData.wrongAnswer2.trim() && { wrongAnswer2: mcpData.wrongAnswer2.trim() }),
            ...(mcpData.wrongAnswer3.trim() && { wrongAnswer3: mcpData.wrongAnswer3.trim() }),
          };
        } else {
          const textData = formData;
          requestData = {
            type: 'text',
            question: textData.question.trim(),
            ...(textData.rubric.trim() && { rubric: textData.rubric.trim() }),
          };
        }

        if (isEditing) {
          console.log('[Question form] initialData: ', initialData);
          
          const { documentId } = initialData;
          console.log('[Question form] documentId: ', documentId);
          
          if (!documentId) {
            setErrors({ general: 'No valid ID found for updating this question' });
            return;
          }

          result = await updateQuestionAction(documentId, requestData);
        } else {
          result = await createQuestionAction(requestData as CreateQuestionData);
        }

        if (result.success && result.data) {
          onSuccess?.(result.data);
          // Reset form if creating new
          if (!isEditing) {
            if (formData.type === 'mcp') {
              setFormData({
                type: 'mcp',
                question: '',
                rightAnswer: '',
                wrongAnswer1: '',
                wrongAnswer2: '',
                wrongAnswer3: '',
              });
            } else {
              setFormData({
                type: 'text',
                question: '',
                rubric: '',
              });
            }
          }
        } else {
          setErrors({ general: result.error || 'An error occurred' });
        }
      } catch (error) {
        console.error('Form submission error:', error);
        setErrors({ 
          general: error instanceof Error ? error.message : 'An unexpected error occurred' 
        });
      }
    });
  };

  const handleCancel = () => {
    // Reset form to initial state
    if (initialData && isMCPQuestion(initialData)) {
      setFormData({
        type: 'mcp',
        question: initialData.question || '',
        rightAnswer: initialData.rightAnswer || '',
        wrongAnswer1: initialData.wrongAnswer1 || '',
        wrongAnswer2: initialData.wrongAnswer2 || '',
        wrongAnswer3: initialData.wrongAnswer3 || '',
      });
    } else if (initialData && isTextQuestion(initialData)) {
      setFormData({
        type: 'text',
        question: initialData.question || '',
        rubric: initialData.rubric || '',
      });
    } else {
      setFormData({
        type: 'mcp',
        question: '',
        rightAnswer: '',
        wrongAnswer1: '',
        wrongAnswer2: '',
        wrongAnswer3: '',
      });
    }
    
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

      {/* Question Type Field */}
      <div className="space-y-2">
        <Label htmlFor="type" className="text-sm font-medium">
          Question Type *
        </Label>
        <Select
          value={formData.type}
          onValueChange={handleTypeChange}
          disabled={isPending || isEditing} // Don't allow changing type when editing
        >
          <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select question type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mcp">Multiple Choice</SelectItem>
            <SelectItem value="text">Text Response</SelectItem>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-red-600">{errors.type}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {isEditing && 'Question type cannot be changed when editing'}
          {!isEditing && 'Multiple choice questions have predefined answer options, text response questions are open-ended'}
        </p>
      </div>

      {/* Question Text Field */}
      <div className="space-y-2">
        <Label htmlFor="question" className="text-sm font-medium">
          Question Text *
        </Label>
        <Textarea
          id="question"
          placeholder="Enter your question here..."
          value={formData.question}
          onChange={(e) => handleInputChange('question', e.target.value)}
          className={`min-h-[100px] resize-vertical ${errors.question ? 'border-red-500' : ''}`}
          disabled={isPending}
          maxLength={1000}
        />
        <div className="flex justify-between items-center">
          {errors.question && (
            <p className="text-sm text-red-600">{errors.question}</p>
          )}
          <p className="text-sm text-muted-foreground ml-auto">
            {formData.question.length}/1000 characters
          </p>
        </div>
      </div>

      {/* Multiple Choice Question Fields */}
      {formData.type === 'mcp' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Answer Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Correct Answer */}
            <div className="space-y-2">
              <Label htmlFor="rightAnswer" className="text-sm font-medium text-green-700">
                Correct Answer *
              </Label>
              <Input
                id="rightAnswer"
                placeholder="Enter the correct answer..."
                value={formData.rightAnswer}
                onChange={(e) => handleInputChange('rightAnswer', e.target.value)}
                className={`${errors.rightAnswer ? 'border-red-500' : 'border-green-200'}`}
                disabled={isPending}
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                {errors.rightAnswer && (
                  <p className="text-sm text-red-600">{errors.rightAnswer}</p>
                )}
                <p className="text-sm text-muted-foreground ml-auto">
                  {formData.rightAnswer.length}/500 characters
                </p>
              </div>
            </div>

            {/* Wrong Answers */}
            {[1, 2, 3].map((num) => {
              const fieldName = `wrongAnswer${num}` as keyof MCPFormData;
              const fieldValue = formData[fieldName] || '';
              const fieldError = errors[fieldName];

              return (
                <div key={fieldName} className="space-y-2">
                  <Label htmlFor={fieldName} className="text-sm font-medium text-red-700">
                    Wrong Answer {num} (Optional)
                  </Label>
                  <Input
                    id={fieldName}
                    placeholder={`Enter wrong answer option ${num}...`}
                    value={fieldValue}
                    onChange={(e) => handleInputChange(fieldName, e.target.value)}
                    className={`${fieldError ? 'border-red-500' : 'border-red-100'}`}
                    disabled={isPending}
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center">
                    {fieldError && (
                      <p className="text-sm text-red-600">{fieldError}</p>
                    )}
                    <p className="text-sm text-muted-foreground ml-auto">
                      {fieldValue.length}/500 characters
                    </p>
                  </div>
                </div>
              );
            })}

            <p className="text-sm text-muted-foreground">
              At least the correct answer is required. Wrong answers are optional but help create better multiple choice questions.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Text Response Question Fields */}
      {formData.type === 'text' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evaluation Rubric</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rubric" className="text-sm font-medium">
                Rubric (Optional)
              </Label>
              <Textarea
                id="rubric"
                placeholder="Describe how to evaluate responses to this question..."
                value={formData.rubric}
                onChange={(e) => handleInputChange('rubric', e.target.value)}
                className={`min-h-[120px] resize-vertical ${errors.rubric ? 'border-red-500' : ''}`}
                disabled={isPending}
                maxLength={2000}
              />
              <div className="flex justify-between items-center">
                {errors.rubric && (
                  <p className="text-sm text-red-600">{errors.rubric}</p>
                )}
                <p className="text-sm text-muted-foreground ml-auto">
                  {formData.rubric.length}/2000 characters
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              The rubric helps assessors evaluate text responses consistently. Include key points, criteria, or examples of good answers.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {(() => {
            if (isPending) {
              return isEditing ? 'Updating...' : 'Creating...';
            }
            return isEditing ? 'Update Question' : 'Create Question';
          })()}
        </Button>
      </div>
    </form>
  );
}

'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Save, X, Upload, FileAudio, Trash2, Play, Pause } from 'lucide-react';
import { IAudioCall } from '@/types';
import { 
  createAudioCallAction, 
  updateAudioCallAction, 
  updateAudioCallWithFileAction 
} from '@/app/actions/audio-call.actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AudioCallFormProps {
  /** Existing audio call data for editing, undefined for creating new */
  readonly initialData?: IAudioCall & { documentId?: string };
  /** Called when form is submitted successfully */
  readonly onSuccess?: (data: IAudioCall) => void;
  /** Called when form is cancelled */
  readonly onCancel?: () => void;
  /** Additional CSS classes */
  readonly className?: string;
}

interface FormData {
  file: File | null;
  description: string;
  transcription: string;
  rubric: string;
}

interface FormErrors {
  file?: string;
  description?: string;
  transcription?: string;
  rubric?: string;
  general?: string;
}

// Strapi base URL for audio files
const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL?.replace('/api', '') || 'http://localhost:1337';

export function AudioCallForm({ 
  initialData, 
  onSuccess, 
  onCancel, 
  className = '' 
}: AudioCallFormProps) {
  // More robust editing detection - check for any identifier
  const isEditing = !!(initialData?.documentId || initialData?.id || (initialData && Object.keys(initialData).length > 0 && (initialData.file?.url || initialData.description)));
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    file: null,
    description: initialData?.description || '',
    transcription: initialData?.transcription || '',
    rubric: initialData?.rubric || '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Accepted audio file types
  const acceptedAudioTypes = '.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac';
  const maxFileSize = 100 * 1024 * 1024; // 100MB for audio calls

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!isEditing && !audioFile) {
      newErrors.file = 'Audio file is required for new uploads';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Call description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (formData.transcription && formData.transcription.length > 10000) {
      newErrors.transcription = 'Transcription must be less than 10000 characters';
    }

    if (formData.rubric && formData.rubric.length > 5000) {
      newErrors.rubric = 'Evaluation must be less than 5000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (field in errors && errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field as keyof FormErrors]: undefined }));
    }
  };

  const validateFile = (file: File): string | null => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/flac'];
    if (!validTypes.includes(file.type) && !/\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.exec(file.name)) {
      return 'Please select a valid audio file (.mp3, .wav, .m4a, .aac, .ogg, .webm, .flac)';
    }
    
    if (file.size > maxFileSize) {
      return `File size must be less than ${maxFileSize / 1024 / 1024}MB`;
    }
    
    return null;
  };

  const generateAutoDescription = (fileName: string): string => {
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");
    const formattedName = nameWithoutExtension.replaceAll(/[-_]/g, ' ').replaceAll(/\b\w/g, l => l.toUpperCase());
    return `Emergency Call Recording: ${formattedName}`;
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setErrors(prev => ({ ...prev, file: validationError }));
      return;
    }

    setAudioFile(file);
    setErrors(prev => ({ ...prev, file: undefined }));

    // Auto-generate description if empty
    if (!formData.description.trim()) {
      const autoDescription = generateAutoDescription(file.name);
      setFormData(prev => ({ ...prev, description: autoDescription }));
    }
  }, [formData.description]);

  const handlePlayPreview = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const saveAudioCallData = async (file?: File) => {
    console.log('[AudioCallForm] saveAudioCallData called: ', { formData, isEditing, initialData });
    
    const audioCallData = {
      description: formData.description.trim(),
      transcription: formData.transcription.trim() || undefined,
      rubric: formData.rubric.trim() || undefined,
    };

    if (isEditing) {
      const audioCallId = initialData?.documentId;
      if (!audioCallId) {
        throw new Error('No valid ID found for updating this audio call');
      }

      if (file) {
        // Update with new file
        return await updateAudioCallWithFileAction(audioCallId, {
          file,
          ...audioCallData
        });
      } else {
        // Update metadata only
        return await updateAudioCallAction(audioCallId, audioCallData);
      }
    } else {
      // For new files, we need the file
      if (!file) {
        throw new Error('File required for new audio call');
      }
      
      return await createAudioCallAction({ 
        file,
        ...audioCallData
      });
    }
  };

  const resetFormAfterSuccess = () => {
    if (!isEditing) {
      setFormData({ 
        file: null, 
        description: '', 
        transcription: '', 
        rubric: '' 
      });
      setAudioFile(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      try {
        let fileToSave = audioFile;

        const result = await saveAudioCallData(fileToSave || undefined);

        if (result.success && result.data) {
          onSuccess?.(result.data);
          resetFormAfterSuccess();
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

  const handleRemoveFile = () => {
    setAudioFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {errors.general && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Call Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Call Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div>
              <Label htmlFor="description">Call Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the emergency call situation and context..."
                rows={4}
                disabled={isPending}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Audio File */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audio File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current file display (for editing) */}
            {isEditing && initialData?.file?.url && !audioFile && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {initialData.file.name || 'Current audio file'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Current file - upload a new one to replace
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio
                      ref={audioRef}
                      src={`${STRAPI_BASE_URL}${initialData.file.url}`}
                      onEnded={() => setIsPlaying(false)}
                      onError={() => setIsPlaying(false)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePlayPreview}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* File upload */}
            <div>
              <Label htmlFor="file">
                {isEditing ? 'Replace Audio File (optional)' : 'Audio File *'}
              </Label>
              <div className="mt-1">
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept={acceptedAudioTypes}
                  onChange={handleFileSelect}
                  disabled={isPending}
                  className="hidden"
                />
                
                {audioFile ? (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileAudio className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            {audioFile.name}
                          </p>
                          <p className="text-xs text-green-600">
                            {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveFile}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className={`w-full h-20 border-dashed ${errors.file ? 'border-red-500' : 'border-muted-foreground/25'}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to select audio file
                      </span>
                      <span className="text-xs text-muted-foreground">
                        MP3, WAV, M4A, AAC, OGG, WebM, FLAC up to {maxFileSize / 1024 / 1024}MB
                      </span>
                    </div>
                  </Button>
                )}
              </div>
              {errors.file && <p className="text-sm text-red-500 mt-1">{errors.file}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Transcription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transcription</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="transcription">Call Transcription (optional)</Label>
              <Textarea
                id="transcription"
                value={formData.transcription}
                onChange={(e) => handleInputChange('transcription', e.target.value)}
                placeholder="Full transcription of the emergency call conversation..."
                rows={6}
                disabled={isPending}
                className={errors.transcription ? 'border-red-500' : ''}
              />
              {errors.transcription && <p className="text-sm text-red-500 mt-1">{errors.transcription}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Evaluation/Rubric */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="rubric">Performance Evaluation (optional)</Label>
              <Textarea
                id="rubric"
                value={formData.rubric}
                onChange={(e) => handleInputChange('rubric', e.target.value)}
                placeholder="Performance evaluation, scoring rubric, and assessment notes..."
                rows={4}
                disabled={isPending}
                className={errors.rubric ? 'border-red-500' : ''}
              />
              {errors.rubric && <p className="text-sm text-red-500 mt-1">{errors.rubric}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {(() => {
              if (isPending) {
                return isEditing ? 'Updating...' : 'Creating...';
              }
              return isEditing ? 'Update Audio Call' : 'Create Audio Call';
            })()}
          </Button>
        </div>
      </form>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  ICompany,
  CreateCompanyData,
  UpdateCompanyData,
  validateCreateCompanyData,
  validateUpdateCompanyData,
} from '@/types/company.types';
import { createCompanyAction, updateCompanyAction } from '@/app/actions/companies.actions';

// Form validation schema
const companyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  legalName: z.string().optional(),
  externalId: z.string().optional(),
  taxId: z.string().optional(),
  officeAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  timeZone: z.string().optional(),
  defaultJobTitles: z.enum(['Recruiter', 'Senior Recruiter', 'Talent Partner', 'HR Manager']).optional(),
  subscriptionPlan: z.enum(['trial', 'standard', 'enterprise']).optional(),
  seatsLimit: z.coerce.number().min(1).optional(),
  subscriptionStatus: z.enum(['active', 'suspend', 'pending']).optional(),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal('')),
  primaryContactPhone: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingDate: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: (ICompany & { documentId?: string }) | undefined;
  onSuccess?: (data: ICompany) => void;
}

export default function CompanyModal({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: CompanyModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!initialData;

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      legalName: '',
      externalId: '',
      taxId: '',
      officeAddress: '',
      city: '',
      state: '',
      zipCode: '',
      timeZone: '',
      primaryContactName: '',
      primaryContactEmail: '',
      primaryContactPhone: '',
      onboardingCompleted: false,
    },
  });

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open && initialData) {
      // Editing mode - populate form with existing data
      form.reset({
        name: initialData.name || '',
        legalName: initialData.legalName || '',
        externalId: initialData.externalId || '',
        taxId: initialData.taxId || '',
        officeAddress: initialData.officeAddress || '',
        city: initialData.city || '',
        state: initialData.state || '',
        zipCode: initialData.zipCode || '',
        timeZone: initialData.timeZone || '',
        defaultJobTitles: initialData.defaultJobTitles,
        subscriptionPlan: initialData.subscriptionPlan,
        seatsLimit: initialData.seatsLimit,
        subscriptionStatus: initialData.subscriptionStatus,
        primaryContactName: initialData.primaryContactName || '',
        primaryContactEmail: initialData.primaryContactEmail || '',
        primaryContactPhone: initialData.primaryContactPhone || '',
        onboardingCompleted: initialData.onboardingCompleted || false,
        onboardingDate: initialData.onboardingDate ? 
          (typeof initialData.onboardingDate === 'string' ? initialData.onboardingDate : initialData.onboardingDate.toISOString().split('T')[0]) 
          : '',
      });
    } else if (open && !initialData) {
      // Create mode - reset to defaults
      form.reset({
        name: '',
        legalName: '',
        externalId: '',
        taxId: '',
        officeAddress: '',
        city: '',
        state: '',
        zipCode: '',
        timeZone: '',
        primaryContactName: '',
        primaryContactEmail: '',
        primaryContactPhone: '',
        onboardingCompleted: false,
        subscriptionPlan: 'trial',
        subscriptionStatus: 'pending',
        seatsLimit: 10,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);

    try {
      let result;

      if (isEditing && initialData) {
        // Update existing company
        const companyId = initialData.documentId || (initialData as any).id;
        if (!companyId) {
          throw new Error('No valid company ID found for update');
        }

        // Prepare update data
        const updateData: UpdateCompanyData = {
          ...data,
          primaryContactEmail: data.primaryContactEmail || undefined,
          onboardingDate: data.onboardingDate || undefined,
        };

        // Remove undefined/empty optional fields
        Object.keys(updateData).forEach(key => {
          const value = (updateData as any)[key];
          if (value === '' || value === undefined) {
            delete (updateData as any)[key];
          }
        });

        result = await updateCompanyAction(companyId, updateData);
      } else {
        // Create new company
        const createData: CreateCompanyData = {
          ...data,
          primaryContactEmail: data.primaryContactEmail || undefined,
          onboardingDate: data.onboardingDate || undefined,
        };

        // Remove undefined/empty optional fields
        Object.keys(createData).forEach(key => {
          const value = (createData as any)[key];
          if (value === '' || value === undefined) {
            delete (createData as any)[key];
          }
        });

        result = await createCompanyAction(createData);
      }

      if (result.success && result.data) {
        toast({
          title: isEditing ? 'Company Updated' : 'Company Created',
          description: `Company "${result.data.name}" has been ${isEditing ? 'updated' : 'created'} successfully.`,
        });

        onSuccess?.(result.data);
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          title: isEditing ? 'Update Failed' : 'Creation Failed',
          description: result.error || `Failed to ${isEditing ? 'update' : 'create'} company.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting company:', error);
      toast({
        title: isEditing ? 'Update Failed' : 'Creation Failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Company' : 'Create New Company'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the company information below.'
              : 'Fill in the information to create a new company.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Legal Name */}
              <FormField
                control={form.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter legal name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* External ID */}
              <FormField
                control={form.control}
                name="externalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>External ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter external ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax ID */}
              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tax ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* State */}
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter state" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ZIP Code */}
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ZIP code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time Zone */}
              <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., America/New_York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Default Job Titles */}
              <FormField
                control={form.control}
                name="defaultJobTitles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Job Title</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select job title" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Recruiter">Recruiter</SelectItem>
                        <SelectItem value="Senior Recruiter">Senior Recruiter</SelectItem>
                        <SelectItem value="Talent Partner">Talent Partner</SelectItem>
                        <SelectItem value="HR Manager">HR Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subscription Plan */}
              <FormField
                control={form.control}
                name="subscriptionPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Seats Limit */}
              <FormField
                control={form.control}
                name="seatsLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seats Limit</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="Enter seats limit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subscription Status */}
              <FormField
                control={form.control}
                name="subscriptionStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspend">Suspended</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Primary Contact Name */}
              <FormField
                control={form.control}
                name="primaryContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Primary Contact Email */}
              <FormField
                control={form.control}
                name="primaryContactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter contact email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Primary Contact Phone */}
              <FormField
                control={form.control}
                name="primaryContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Onboarding Date */}
              <FormField
                control={form.control}
                name="onboardingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onboarding Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Office Address */}
            <FormField
              control={form.control}
              name="officeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Office Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter office address" 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Onboarding Completed */}
            <FormField
              control={form.control}
              name="onboardingCompleted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Onboarding Completed</FormLabel>
                    <FormDescription>
                      Mark if the company has completed the onboarding process.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditing
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditing
                  ? 'Update Company'
                  : 'Create Company'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
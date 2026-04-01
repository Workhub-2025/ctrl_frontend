'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getCompaniesAction, 
  createCompanyAction,
  updateCompanyAction,
  deleteCompanyAction
} from '@/app/actions/companies.actions';
import { IQuestion, PaginatedResponse, isMCPQuestion, isTextQuestion } from '@/types';

// UI Components
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';

// Icons
import {
  Plus,
  Search,
  Download,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Eye,
  FileText,
} from 'lucide-react';

import { QuestionModal } from '@/components/admin/question-modal';
import { ICompany } from '@/types/company.types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_QUERY_PARAMS = {
  sort: 'createdAt:desc',
};

/**
 * Fetch questions wrapper function
 */
const fetchQuestions = async (
  page: number,
  pageSize: number,
  params: any
): Promise<any | null> => {
  const result = await getCompaniesAction({
    page,
    pageSize,
    ...params,
  });

  if (result.success && result.data) {
    return result.data;
  }

  console.error('Failed to fetch questions:', result.error);
  return null;
};

/**
 * Create question wrapper function
 */
const createQuestion = async (data: IQuestion): Promise<{ success: boolean; data?: IQuestion; error?: string }> => {
  const result = await createCompanyAction(data as any);
  return {
    success: result.success,
    data: result.data as IQuestion | undefined,
    error: result.error,
  };
};

/**
 * Update question wrapper function
 */
const updateQuestion = async (
  id: number | string,
  data: IQuestion
): Promise<{ success: boolean; data?: IQuestion; error?: string }> => {
  const result = await updateCompanyAction(id, data as any);
  return {
    success: result.success,
    data: result.data as IQuestion | undefined,
    error: result.error,
  };
};

/**
 * Delete question wrapper function
 */
const deleteQuestion = async (
  id: string | number
): Promise<{ success: boolean; error?: string }> => {
  const result = await deleteCompanyAction(id);
  return {
    success: result.success,
    error: result.error,
  };
};

export default function QuestionsPage() {
  const { toast } = useToast();

  // Data
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaginationLoading, setIsPaginationLoading] = useState<boolean>(false);
  const [selectedQuestion, setSelectedQuestion] = useState<IQuestion | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | number | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<(IQuestion & { documentId?: string }) | undefined>(undefined);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Refs for debounce and request ordering
  const searchTimerRef = useRef<number | undefined>(undefined);
  const requestIdRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);

  // Build query params from explicit inputs (avoids stale state)
  const buildQueryParams = useCallback(
    (opts?: {
      search?: string;
      type?: string;
      extra?: any;
    }) => {
      const { search, type, extra } = opts || {};
      const qp: any = {};

      // filters
      const filters: any = {};

      if (search?.trim()) {
        const q = search.trim();
        // Search in question text, rightAnswer, and rubric
        filters.$or = [
          { question: { $containsi: q } },
          { rightAnswer: { $containsi: q } },
          { rubric: { $containsi: q } }
        ];
      }

      if (type && type !== 'all') {
        filters.type = { $eq: type };
      }

      if (Object.keys(filters).length) {
        qp.filters = filters;
      }

      // sort (defaults)
      qp.sort = DEFAULT_QUERY_PARAMS.sort;

      // merge extras if provided (careful: extras expected to be plain object)
      if (extra && typeof extra === 'object') {
        Object.assign(qp, extra);
      }

      return qp;
    },
    []
  );

  // Centralized fetch that uses an incrementing request id to ignore out-of-order responses
  const fetchQuestionData = useCallback(
    async (opts?: {
      page?: number;
      size?: number;
      search?: string;
      type?: string;
      extraQueryParams?: any;
    }) => {
      const page = opts?.page ?? currentPage;
      const size = opts?.size ?? pageSize;
      const search = opts?.search ?? searchTerm;
      const type = opts?.type ?? typeFilter;

      setIsPaginationLoading(true);

      // assign request id
      const reqId = ++requestIdRef.current;

      try {
        const queryParams = buildQueryParams({
          search,
          type,
          extra: opts?.extraQueryParams,
        });

        const response: PaginatedResponse<IQuestion> | null = await fetchQuestions(page, size, queryParams);

        // ignore if this is not the latest request or component unmounted
        if (!mountedRef.current || reqId !== requestIdRef.current) return;

        if (response) {
          setQuestions(response.data || []);
          setTotalPages(response.meta?.pagination?.pageCount ?? 1);
          setTotalQuestions(response.meta?.pagination?.total ?? 0);
          setCurrentPage(response.meta?.pagination?.page ?? page);
        } else {
          setQuestions([]);
          setTotalPages(1);
          setTotalQuestions(0);
        }
      } catch (err) {
        // ignore stale errors if unmounted or outdated
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        console.error('Error fetching questions:', err);
        setQuestions([]);
        setTotalPages(1);
        setTotalQuestions(0);
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) {
          setIsPaginationLoading(false);
        }
      }
    },
    [buildQueryParams, currentPage, pageSize, searchTerm, typeFilter]
  );

  // Initial load
  useEffect(() => {
    mountedRef.current = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      // initial paginated fetch with default params
      await fetchQuestionData({ page: DEFAULT_PAGE, size: pageSize, extraQueryParams: DEFAULT_QUERY_PARAMS });
      setIsLoading(false);
    };

    loadInitialData();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Re-fetch when page or pageSize changes (keeps current filters)
  useEffect(() => {
    fetchQuestionData({ page: currentPage, size: pageSize, search: searchTerm, type: typeFilter });
  }, [currentPage, pageSize, fetchQuestionData, searchTerm, typeFilter]);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      // reset to first page when searching
      setCurrentPage(1);

      // clear previous timer
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
      // set new timer
      searchTimerRef.current = window.setTimeout(() => {
        fetchQuestionData({ page: 1, size: pageSize, search: value, type: typeFilter });
      }, 400);
    },
    [fetchQuestionData, pageSize, typeFilter]
  );

  // Filter handlers
  const handleTypeFilterChange = useCallback(
    (value: string) => {
      setTypeFilter(value);
      setCurrentPage(1);
      fetchQuestionData({ page: 1, size: pageSize, search: searchTerm, type: value });
    },
    [fetchQuestionData, pageSize, searchTerm]
  );

  const clearAllFilters = useCallback(async () => {
    // clear debounce timer
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = undefined;
    }
    setSearchTerm('');
    setTypeFilter('all');
    setCurrentPage(1);
    await fetchQuestionData({ page: 1, size: pageSize, extraQueryParams: DEFAULT_QUERY_PARAMS });
  }, [fetchQuestionData, pageSize]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    },
    [currentPage, totalPages]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: string) => {
      const size = Number.parseInt(newPageSize, 10) || DEFAULT_PAGE_SIZE;
      setPageSize(size);
      setCurrentPage(1);
    },
    []
  );

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setEditingQuestion(undefined);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((question: IQuestion & { documentId?: string }) => {
    console.log('[Editing question] openEditModal question parameter: ', question);
    
    setEditingQuestion(question);
    setIsModalOpen(true);
  }, []);

  const handleModalSuccess = useCallback((data: IQuestion) => {
    toast({
      title: editingQuestion ? 'Question Updated' : 'Question Created',
      description: `Question has been ${editingQuestion ? 'updated' : 'created'} successfully.`,
    });
    
    // Refresh the current page data
    fetchQuestionData({ page: currentPage, size: pageSize, search: searchTerm, type: typeFilter });
  }, [editingQuestion, fetchQuestionData, currentPage, pageSize, searchTerm, typeFilter, toast]);

  // Delete handler
  const handleDelete = useCallback(async (question: IQuestion & { documentId?: string }, questionPreview: string) => {
    // Try to get the ID from different possible fields
    const questionId = question.documentId || (question as any).id || (question as any)._id;
    
    if (!questionId) {
      toast({
        title: 'Delete Failed',
        description: 'No valid ID found for this question.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeletingId(questionId);
    
    try {
      const result = await deleteQuestion(questionId);
      
      if (result.success) {
        toast({
          title: 'Question Deleted',
          description: 'Question has been deleted successfully.',
        });
        
        // Refresh the current page data
        fetchQuestionData({ page: currentPage, size: pageSize, search: searchTerm, type: typeFilter });
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete question.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingId(null);
    }
  }, [fetchQuestionData, currentPage, pageSize, searchTerm, typeFilter, toast]);

  // Utilities
  const getTypeBadge = useCallback((type: string | undefined) => {
    if (type === 'mcp') {
      return <Badge variant="secondary">Multiple Choice</Badge>;
    } else if (type === 'text') {
      return <Badge variant="default">Text</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  }, []);

  const truncateText = useCallback((str: string | undefined, maxLength: number = 100) => {
    if (!str) return 'No question text';
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  }, []);

  const hasActiveFilters = useMemo(
    () => !!searchTerm.trim() || typeFilter !== 'all',
    [searchTerm, typeFilter]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
      mountedRef.current = false;
    };
  }, []);

  // --- Render (following candidates page pattern) ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">Questions</h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">Loading questions data...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {['row1', 'row2', 'row3', 'row4', 'row5'].map((key) => (
                <div key={key} className="flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-4 bg-muted rounded w-48" />
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-4 bg-muted rounded w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">Questions</h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Manage assessment questions for multiple choice and text responses
          </p>
        </div>
        <div className="flex justify-end gap-3 title-adaptive">
          <Button
            onClick={openCreateModal}
            className="btn-outline-fix bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create New Question
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Filters</CardTitle>
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions, answers, or rubric..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={(v) => handleTypeFilterChange(v)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mcp">Multiple Choice</SelectItem>
              <SelectItem value="text">Text Response</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters:</span>
          {searchTerm.trim() && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchTerm}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleSearchChange('')}
              />
            </Badge>
          )}
          {typeFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {typeFilter === 'mcp' ? 'Multiple Choice' : 'Text Response'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleTypeFilterChange('all')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                Records ({totalQuestions} total{hasActiveFilters ? ' found' : ''})
              </CardTitle>
              <CardDescription>
                {hasActiveFilters 
                  ? `Showing filtered results • Page ${currentPage} of ${totalPages}`
                  : `Overview of all assessment questions`
                }
                {totalPages > 1 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    • Showing {questions?.length} of {totalQuestions} questions
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {isPaginationLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {/* No results message */}
            {!isPaginationLoading && questions.length === 0 && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No questions found matching your filters.</p>
                      <Button 
                        variant="link" 
                        onClick={clearAllFilters}
                        className="mt-2"
                      >
                        Clear filters to see all questions
                      </Button>
                    </>
                  ) : (
                    <p>No questions available yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            {questions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Answer/Rubric</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions?.map((question, index) => {
                    return (
                      <TableRow 
                        key={question.documentId || (question as any).id || (question as any)._id || index} 
                        className={`hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                        }`}
                      >
                        <TableCell className="max-w-md">
                          <div className="space-y-1">
                            <p className="font-medium">
                              {truncateText(question.question, 80)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTypeBadge(question.type)}
                        </TableCell>
                        <TableCell className="max-w-sm">
                          {isMCPQuestion(question) && question.rightAnswer && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-green-600">
                                ✓ {truncateText(question.rightAnswer, 60)}
                              </p>
                              {[question.wrongAnswer1, question.wrongAnswer2, question.wrongAnswer3]
                                .filter(Boolean)
                                .map((wrongAnswer, i) => (
                                  <p key={i} className="text-sm text-muted-foreground">
                                    ✗ {truncateText(wrongAnswer, 40)}
                                  </p>
                                ))}
                            </div>
                          )}
                          {isTextQuestion(question) && question.rubric && (
                            <p className="text-sm text-muted-foreground">
                              {truncateText(question.rubric, 60)}
                            </p>
                          )}
                          {isTextQuestion(question) && !question.rubric && (
                            <p className="text-sm text-muted-foreground italic">
                              No rubric provided
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {question.createdAt
                              ? new Date(question.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedQuestion(question)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Question Details
                                  </DialogTitle>
                                  <DialogDescription>
                                    Complete question content and metadata
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedQuestion && (
                                  <div className="space-y-6">
                                    {/* Question Metadata */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Question Information</CardTitle>
                                      </CardHeader>
                                      <CardContent className="grid grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">Type</span>
                                          <div>{getTypeBadge(selectedQuestion.type)}</div>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">Created At</span>
                                          <div>
                                            {selectedQuestion.createdAt 
                                              ? new Date(selectedQuestion.createdAt).toLocaleDateString('en-GB', {
                                                  year: 'numeric',
                                                  month: 'long',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })
                                              : 'Unknown'
                                            }
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">Document ID</span>
                                          <div className="font-mono text-xs">{selectedQuestion.documentId || 'N/A'}</div>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                                          <div>
                                            {selectedQuestion.updatedAt 
                                              ? new Date(selectedQuestion.updatedAt).toLocaleDateString('en-GB', {
                                                  year: 'numeric',
                                                  month: 'long',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })
                                              : 'Unknown'
                                            }
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    {/* Question Text */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Question Text</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="p-4 bg-muted rounded-lg">
                                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedQuestion.question || 'No question text available'}
                                          </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Character count: {(selectedQuestion.question || '').length}
                                        </p>
                                      </CardContent>
                                    </Card>

                                    {/* Answers/Rubric based on question type */}
                                    {isMCPQuestion(selectedQuestion) && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Answer Options</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          {/* Correct Answer */}
                                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-green-600 font-medium">✓</span>
                                              <span className="text-sm font-medium text-green-800">Correct Answer</span>
                                            </div>
                                            <p className="text-sm text-green-700">
                                              {selectedQuestion.rightAnswer || 'No correct answer provided'}
                                            </p>
                                          </div>

                                          {/* Wrong Answers */}
                                          {[selectedQuestion.wrongAnswer1, selectedQuestion.wrongAnswer2, selectedQuestion.wrongAnswer3]
                                            .filter(Boolean)
                                            .map((wrongAnswer, index) => (
                                              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className="text-red-600 font-medium">✗</span>
                                                  <span className="text-sm font-medium text-red-800">Wrong Answer {index + 1}</span>
                                                </div>
                                                <p className="text-sm text-red-700">
                                                  {wrongAnswer}
                                                </p>
                                              </div>
                                            ))
                                          }

                                          {[selectedQuestion.wrongAnswer1, selectedQuestion.wrongAnswer2, selectedQuestion.wrongAnswer3]
                                            .filter(Boolean).length === 0 && (
                                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                              <p className="text-sm text-gray-600 italic">
                                                No wrong answer options provided
                                              </p>
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>
                                    )}

                                    {isTextQuestion(selectedQuestion) && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Evaluation Rubric</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          {selectedQuestion.rubric ? (
                                            <>
                                              <div className="p-4 bg-muted rounded-lg">
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                  {selectedQuestion.rubric}
                                                </p>
                                              </div>
                                              <p className="text-xs text-muted-foreground mt-2">
                                                Character count: {(selectedQuestion.rubric || '').length}
                                              </p>
                                            </>
                                          ) : (
                                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                              <p className="text-sm text-gray-600 italic">
                                                No evaluation rubric provided for this text response question
                                              </p>
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(question as IQuestion & { documentId?: string })}
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isDeletingId === (question.documentId || (question as any).id || (question as any)._id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Question</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this question? This action cannot be undone.
                                    <br />
                                    <br />
                                    <strong>Question:</strong> {truncateText(question.question, 100)}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(
                                      question as IQuestion & { documentId?: string }, 
                                      truncateText(question.question, 50)
                                    )}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Question
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(((currentPage - 1) * pageSize) + questions.length, totalQuestions)} of {totalQuestions} results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1 || isPaginationLoading}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPaginationLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        disabled={isPaginationLoading}
                        className="min-w-8"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isPaginationLoading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || isPaginationLoading}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Modal */}
      <QuestionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={editingQuestion}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

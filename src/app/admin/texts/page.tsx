"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileText,
  Plus,
  Edit3,
  Trash2,
} from "lucide-react";
import {
  fetchTypingTexts,
  deleteTypingText,
} from "@/app/actions/texts.actions";
import { ITypingText, PaginatedResponse } from "@/types";
import { TypingTextModal } from "@/components/admin/typing-text-modal";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_QUERY_PARAMS = {
  sort: "createdAt:desc",
};

export default function TextsPage() {
  const { toast } = useToast();

  // Data
  const [texts, setTexts] = useState<ITypingText[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTexts, setTotalTexts] = useState<number>(0);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaginationLoading, setIsPaginationLoading] =
    useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<ITypingText | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingText, setEditingText] = useState<
    (ITypingText & { documentId?: string }) | undefined
  >(undefined);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Refs for debounce and request ordering
  const searchTimerRef = useRef<number | undefined>(undefined);
  const requestIdRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);

  // Build query params from explicit inputs (avoids stale state)
  const buildQueryParams = useCallback(
    (opts?: { search?: string; type?: string; extra?: any }) => {
      const { search, type, extra } = opts || {};
      const qp: any = {};

      // filters
      const filters: any = {};

      if (search?.trim()) {
        const q = search.trim();
        filters.text = { $containsi: q };
      }

      if (type && type !== "all") {
        filters.type = { $eq: type };
      }

      if (Object.keys(filters).length) {
        qp.filters = filters;
      }

      // sort (defaults)
      qp.sort = DEFAULT_QUERY_PARAMS.sort;

      // merge extras if provided (careful: extras expected to be plain object)
      if (extra && typeof extra === "object") {
        Object.assign(qp, extra);
      }

      return qp;
    },
    []
  );

  // Centralized fetch that uses an incrementing request id to ignore out-of-order responses
  const fetchTextData = useCallback(
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

        const response: PaginatedResponse<ITypingText> | null =
          await fetchTypingTexts(page, size, queryParams);

        // ignore if this is not the latest request or component unmounted
        if (!mountedRef.current || reqId !== requestIdRef.current) return;

        if (response) {
          setTexts(response.data || []);
          setTotalPages(response.meta?.pagination?.pageCount ?? 1);
          setTotalTexts(response.meta?.pagination?.total ?? 0);
          setCurrentPage(response.meta?.pagination?.page ?? page);
        } else {
          setTexts([]);
          setTotalPages(1);
          setTotalTexts(0);
        }
      } catch (err) {
        // ignore stale errors if unmounted or outdated
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        console.error("Error fetching typing texts:", err);
        setTexts([]);
        setTotalPages(1);
        setTotalTexts(0);
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
      await fetchTextData({
        page: DEFAULT_PAGE,
        size: pageSize,
        extraQueryParams: DEFAULT_QUERY_PARAMS,
      });
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
    fetchTextData({
      page: currentPage,
      size: pageSize,
      search: searchTerm,
      type: typeFilter,
    });
  }, [currentPage, pageSize, fetchTextData, searchTerm, typeFilter]);

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
        fetchTextData({
          page: 1,
          size: pageSize,
          search: value,
          type: typeFilter,
        });
      }, 400);
    },
    [fetchTextData, pageSize, typeFilter]
  );

  // Filter handlers
  const handleTypeFilterChange = useCallback(
    (value: string) => {
      setTypeFilter(value);
      setCurrentPage(1);
      fetchTextData({
        page: 1,
        size: pageSize,
        search: searchTerm,
        type: value,
      });
    },
    [fetchTextData, pageSize, searchTerm]
  );

  const clearAllFilters = useCallback(async () => {
    // clear debounce timer
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = undefined;
    }
    setSearchTerm("");
    setTypeFilter("all");
    setCurrentPage(1);
    await fetchTextData({
      page: 1,
      size: pageSize,
      extraQueryParams: DEFAULT_QUERY_PARAMS,
    });
  }, [fetchTextData, pageSize]);

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
      const size = parseInt(newPageSize, 10) || DEFAULT_PAGE_SIZE;
      setPageSize(size);
      setCurrentPage(1);
    },
    []
  );

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setEditingText(undefined);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((text: ITypingText & { documentId?: string }) => {
    console.log('[Editing text] openEditModal text parameter: ', text);
    
    setEditingText(text);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingText(undefined);
  }, []);

  const handleModalSuccess = useCallback(
    (data: ITypingText) => {
      toast({
        title: editingText ? "Text Updated" : "Text Created",
        description: `Typing text has been ${
          editingText ? "updated" : "created"
        } successfully.`,
      });

      // Refresh the current page data
      fetchTextData({
        page: currentPage,
        size: pageSize,
        search: searchTerm,
        type: typeFilter,
      });
    },
    [
      editingText,
      fetchTextData,
      currentPage,
      pageSize,
      searchTerm,
      typeFilter,
      toast,
    ]
  );

  // Delete handler
  const handleDelete = useCallback(
    async (
      text: ITypingText & { documentId?: string },
      textPreview: string
    ) => {
      // Try to get the ID from different possible fields
      const textId = text.documentId || (text as any).id || (text as any)._id;

      if (!textId) {
        toast({
          title: "Delete Failed",
          description: "No valid ID found for this text.",
          variant: "destructive",
        });
        return;
      }

      setIsDeletingId(textId);

      try {
        const result = await deleteTypingText(textId);

        if (result.success) {
          toast({
            title: "Text Deleted",
            description: "Typing text has been deleted successfully.",
          });

          // Refresh the current page data
          fetchTextData({
            page: currentPage,
            size: pageSize,
            search: searchTerm,
            type: typeFilter,
          });
        } else {
          toast({
            title: "Delete Failed",
            description: result.error || "Failed to delete typing text.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Delete error:", error);
        toast({
          title: "Delete Failed",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setIsDeletingId(null);
      }
    },
    [fetchTextData, currentPage, pageSize, searchTerm, typeFilter, toast]
  );

  // Utilities
  const getTypeBadge = useCallback((type: string | undefined) => {
    if (type === "practice") {
      return <Badge variant="secondary">Practice</Badge>;
    } else if (type === "test") {
      return <Badge variant="default">Test</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  }, []);

  const truncateText = useCallback(
    (str: string | undefined, maxLength: number = 100) => {
      if (!str) return "No text content";
      return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
    },
    []
  );

  const hasActiveFilters = useMemo(
    () => !!searchTerm.trim() || typeFilter !== "all",
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
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Typing Texts
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Loading typing texts data...
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {["row1", "row2", "row3", "row4", "row5"].map((key) => (
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
        <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
          Typing Texts
        </h3>
        <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
          Manage and review texts for typing test assessments
        </p>
        </div>
      <div className="flex justify-end gap-2 title-adaptive">
        <Button
          onClick={openCreateModal}
          className="btn-outline-fix bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Text
        </Button>
        <Button variant="outline" className="btn-outline-fix">
          <Download className="h-4 w-4 mr-2" />
          Export
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
                placeholder="Search by text content..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => handleTypeFilterChange(v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="practice">Practice</SelectItem>
              <SelectItem value="test">Test</SelectItem>
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
                onClick={() => handleSearchChange("")}
              />
            </Badge>
          )}
          {typeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Type: {typeFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleTypeFilterChange("all")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Typing Texts Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                Records ({totalTexts} total{hasActiveFilters ? ' found' : ''})
              </CardTitle>
              <CardDescription className="text-center text-adaptive-secondary text-sm text-muted-foreground">
                {hasActiveFilters
                  ? `Showing filtered results • Page ${currentPage} of ${totalPages}`
                  : `Overview of all typing texts for assessments`}
                {totalPages > 1 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    • Showing {texts?.length} of {totalTexts} texts
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={pageSize.toString()}
                onValueChange={handlePageSizeChange}
              >
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
            {!isPaginationLoading && texts.length === 0 && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No typing texts found matching your filters.</p>
                      <Button
                        variant="link"
                        onClick={clearAllFilters}
                        className="mt-2"
                      >
                        Clear filters to see all texts
                      </Button>
                    </>
                  ) : (
                    <p>No typing texts available yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            {texts.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Text Preview</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {texts?.map((text, index) => {
                    return (
                      <TableRow
                        key={
                          text.documentId ||
                          (text as any).id ||
                          (text as any)._id ||
                          index
                        }
                        className={`hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }`}
                      >
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm">{truncateText(text.text)}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(text.type)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {text.createdAt
                              ? new Date(text.createdAt).toLocaleDateString(
                                  "en-GB"
                                )
                              : "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedText(text)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Typing Text Details
                                  </DialogTitle>
                                  <DialogDescription>
                                    Complete text content and metadata
                                  </DialogDescription>
                                </DialogHeader>

                                {selectedText && (
                                  <div className="space-y-6">
                                    {/* Text Metadata */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">
                                          Text Information
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="grid grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">
                                            Type
                                          </span>
                                          <div>
                                            {getTypeBadge(selectedText.type)}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">
                                            Created At
                                          </span>
                                          <div>
                                            {selectedText.createdAt
                                              ? new Date(
                                                  selectedText.createdAt
                                                ).toLocaleDateString("en-GB", {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "Unknown"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">
                                            Document ID
                                          </span>
                                          <div className="font-mono text-xs">
                                            {selectedText.documentId || "N/A"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-muted-foreground">
                                            Last Updated
                                          </span>
                                          <div>
                                            {selectedText.updatedAt
                                              ? new Date(
                                                  selectedText.updatedAt
                                                ).toLocaleDateString("en-GB", {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                })
                                              : "Unknown"}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>

                                    {/* Full Text Content */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">
                                          Full Text Content
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="p-4 bg-muted rounded-lg">
                                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedText.text ||
                                              "No text content available"}
                                          </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Character count:{" "}
                                          {(selectedText.text || "").length}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(text)}
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={
                                    isDeletingId ===
                                    (text.documentId ||
                                      (text as any).id ||
                                      (text as any)._id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the typing text:
                                    <br />
                                    <span className="font-medium mt-2 block">
                                      "{truncateText(text.text, 60)}"
                                    </span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleDelete(
                                        text,
                                        truncateText(text.text, 60)
                                      )
                                    }
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {isDeletingId ===
                                    (text.documentId ||
                                      (text as any).id ||
                                      (text as any)._id)
                                      ? "Deleting..."
                                      : "Delete"}
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
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(
                    (currentPage - 1) * pageSize + texts.length,
                    totalTexts
                  )}{" "}
                  of {totalTexts} results
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
                        variant={
                          currentPage === pageNumber ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        disabled={isPaginationLoading}
                        className="w-8 h-8 p-0"
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

      {/* Typing Text Modal */}
      <TypingTextModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={editingText}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

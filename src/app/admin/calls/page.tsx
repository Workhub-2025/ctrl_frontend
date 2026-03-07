"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Label
} from "@/components/ui";
import {
  Search,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Volume2,
  Edit3,
  Trash2,
  Upload,
  Play,
  Pause,
  FileAudio
} from 'lucide-react';
import { 
  getAudioCallsAction, 
  deleteAudioCallAction
} from '@/app/actions/audio-call.actions';
import { IAudioCall } from '@/types';
import { AudioCallModal } from '@/components/admin';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_QUERY_PARAMS = {
  sort: "createdAt:desc",
};

// Strapi base URL for audio files
const STRAPI_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL?.replace("/api", "") ||
  "http://localhost:1337";

export default function CallsPage() {
  const { toast } = useToast();

  // Data
  const [audioCalls, setAudioCalls] = useState<IAudioCall[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalAudioCalls, setTotalAudioCalls] = useState<number>(0);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaginationLoading, setIsPaginationLoading] = useState<boolean>(false);
  const [selectedAudioCall, setSelectedAudioCall] = useState<IAudioCall | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | number | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAudioCall, setEditingAudioCall] = useState<(IAudioCall & { documentId?: string }) | undefined>(undefined);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [transcriptionFilter, setTranscriptionFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Refs for debounce and request ordering
  const searchTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const requestIdRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Build query params from explicit inputs (avoids stale state)
  const buildQueryParams = useCallback(
    (opts?: { search?: string; transcription?: string; extra?: any }) => {
      const { search, transcription, extra } = opts || {};
      const qp: any = {};

      // filters
      const filters: any = {};

      if (search?.trim()) {
        const q = search.trim();
        // Search in title, description and transcription for audio calls
        filters.$or = [
          { title: { $containsi: q } },
          { description: { $containsi: q } },
          { transcription: { $containsi: q } }
        ];
      }

      if (transcription && transcription !== "all") {
        if (transcription === "with") {
          filters.transcription = { $notNull: true };
        } else if (transcription === "without") {
          filters.transcription = { $null: true };
        }
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
  const fetchAudioData = useCallback(
    async (opts?: {
      page?: number;
      size?: number;
      search?: string;
      transcription?: string;
      extraQueryParams?: any;
    }) => {
      const page = opts?.page ?? currentPage;
      const size = opts?.size ?? pageSize;
      const search = opts?.search ?? searchTerm;
      const transcription = opts?.transcription ?? transcriptionFilter;

      setIsPaginationLoading(true);

      // assign request id
      const reqId = ++requestIdRef.current;

      try {
        const queryParams = buildQueryParams({
          search,
          transcription,
          extra: opts?.extraQueryParams,
        });

        const result = await getAudioCallsAction({ 
          page, 
          pageSize: size, 
          ...queryParams 
        });

        console.log('[Calls page] getAudioCallsAction result:', result);
        

        // ignore if this is not the latest request or component unmounted
        if (!mountedRef.current || reqId !== requestIdRef.current) return;

        if (result.success && result.data) {
          setAudioCalls(result.data.data || []);
          setTotalPages(result.data.meta?.pagination?.pageCount ?? 1);
          setTotalAudioCalls(result.data.meta?.pagination?.total ?? 0);
          setCurrentPage(result.data.meta?.pagination?.page ?? page);
        } else {
          setAudioCalls([]);
          setTotalPages(1);
          setTotalAudioCalls(0);
        }
      } catch (err) {
        // ignore stale errors if unmounted or outdated
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        console.error('Error fetching call audios:', err);
        setAudioCalls([]);
        setTotalPages(1);
        setTotalAudioCalls(0);
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) {
          setIsPaginationLoading(false);
        }
      }
    },
    [buildQueryParams, currentPage, pageSize, searchTerm, transcriptionFilter]
  );

  // Initial load
  useEffect(() => {
    mountedRef.current = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      // initial paginated fetch with default params
      await fetchAudioData({
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
    fetchAudioData({
      page: currentPage,
      size: pageSize,
      search: searchTerm,
      transcription: transcriptionFilter,
    });
  }, [currentPage, pageSize, fetchAudioData, searchTerm, transcriptionFilter]);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      // reset to first page when searching
      setCurrentPage(1);

      // clear previous timer
      if (searchTimerRef.current) {
        globalThis.clearTimeout(searchTimerRef.current);
      }
      // set new timer
      searchTimerRef.current = globalThis.setTimeout(() => {
        fetchAudioData({ page: 1, size: pageSize, search: value, transcription: transcriptionFilter });
      }, 400);
    },
    [fetchAudioData, pageSize, transcriptionFilter]
  );

  // Filter handlers
  const handleTranscriptionFilterChange = useCallback(
    (value: string) => {
      setTranscriptionFilter(value);
      setCurrentPage(1);
      fetchAudioData({
        page: 1,
        size: pageSize,
        search: searchTerm,
        transcription: value,
      });
    },
    [fetchAudioData, pageSize, searchTerm]
  );

  const clearAllFilters = useCallback(async () => {
    // clear debounce timer
    if (searchTimerRef.current) {
      globalThis.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = undefined;
    }
    setSearchTerm("");
    setTranscriptionFilter("all");
    setCurrentPage(1);
    await fetchAudioData({
      page: 1,
      size: pageSize,
      extraQueryParams: DEFAULT_QUERY_PARAMS,
    });
  }, [fetchAudioData, pageSize]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    },
    [currentPage, totalPages]
  );

  const handlePageSizeChange = useCallback((newPageSize: string) => {
    const size = Number.parseInt(newPageSize, 10) || DEFAULT_PAGE_SIZE;
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Audio control handlers
  const handlePlayAudio = useCallback((audioCall: IAudioCall) => {
  const audioId = audioCall.documentId || (audioCall as any).id || (audioCall as any)._id;
  if (!audioId || !audioCall.file?.url) return;

  // Stop currently playing audio
  if (playingAudioId && playingAudioId !== audioId) {
    const currentAudio = audioRefs.current[playingAudioId];
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  }

  // Get or create audio element
  let audioElement = audioRefs.current[audioId];
  if (!audioElement) {
    audioElement = new Audio(`${STRAPI_BASE_URL}${audioCall.file.url}`);
    
    audioElement.addEventListener('ended', () => {
      setPlayingAudioId(null);
    });
    
    audioElement.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      toast({
        title: 'Playback Error',
        description: 'Unable to play audio file.',
        variant: 'destructive',
      });
      setPlayingAudioId(null);
    });
    
    audioRefs.current[audioId] = audioElement;
  }

  if (playingAudioId === audioId) {
    // Pause if currently playing
    audioElement.pause();
    setPlayingAudioId(null);
  } else {
    // Play audio
    audioElement.play().catch((error) => {
      console.error("Audio play error:", error);
      toast({
        title: "Playback Error",
        description: "Unable to play audio file.",
        variant: "destructive",
      });
    });
    setPlayingAudioId(audioId);
  }
}, [playingAudioId, toast]);

  // Modal handlers
  const openCreateModal = useCallback(() => {
    setEditingAudioCall(undefined);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((audioCall: IAudioCall & { documentId?: string }) => {
    setEditingAudioCall(audioCall);
    setIsModalOpen(true);
  }, []);

  const handleModalSuccess = useCallback((data: IAudioCall) => {
    toast({
      title: editingAudioCall ? 'Audio Call Updated' : 'Audio Call Created',
      description: `Call audio has been ${editingAudioCall ? 'updated' : 'created'} successfully.`,
    });
    
    // Refresh the current page data
    fetchAudioData({ page: currentPage, size: pageSize, search: searchTerm, transcription: transcriptionFilter });
  }, [editingAudioCall, fetchAudioData, currentPage, pageSize, searchTerm, transcriptionFilter, toast]);

  // Delete handler
  const handleDelete = useCallback(async (audioCall: IAudioCall) => {
  // Try to get the ID from different possible fields
  const audioId = String(audioCall.documentId || audioCall.id || 'unknown');
  
  if (!audioCall.documentId) {
    toast({
      title: 'Delete Failed',
      description: 'No valid document ID found for this audio call.',
      variant: 'destructive',
    });
    return;
  }

  setIsDeletingId(audioId);
  
  try {
    const result = await deleteAudioCallAction(audioCall.documentId);
    
    if (result.success) {
      toast({
        title: "Audio Deleted",
        description: "Call audio has been deleted successfully.",
      });

      // Stop audio if it's currently playing
      if (playingAudioId === audioId) {
        const audioElement = audioRefs.current[audioId];
        if (audioElement) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
        setPlayingAudioId(null);
      }

      // Clean up audio reference
      if (audioRefs.current[audioId]) {
        delete audioRefs.current[audioId];
      }

      // Refresh the current page data
      fetchAudioData({
        page: currentPage,
        size: pageSize,
        search: searchTerm,
        transcription: transcriptionFilter,
      });
    } else {
      toast({
        title: "Delete Failed",
        description: result.error || "Failed to delete call audio.",
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
}, [
  fetchAudioData,
  currentPage,
  pageSize,
  searchTerm,
  transcriptionFilter,
  toast,
  playingAudioId,
]);

  // Utilities
  const getTranscriptionBadge = useCallback(
    (transcription: string | undefined) => {
      if (transcription?.trim()) {
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-300"
          >
            Transcribed
          </Badge>
        );
      }
      return (
        <Badge
          variant="secondary"
          className="bg-orange-100 text-orange-800 border-orange-300"
        >
          No Transcription
        </Badge>
      );
    },
    []
  );

  const truncateText = useCallback(
    (str: string | undefined, maxLength: number = 100) => {
      if (!str) return "No description available";
      return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
    },
    []
  );

  const formatFileUrl = useCallback((file: { url?: string; name?: string } | undefined) => {
    if (!file?.url && !file?.name) return 'No file';
    const fileName = file.name || file.url?.split('/').pop() || 'Unknown file';
    return fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName;
  }, []);

  const hasActiveFilters = useMemo(
    () => !!searchTerm.trim() || transcriptionFilter !== "all",
    [searchTerm, transcriptionFilter]
  );

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      audioRefs.current = {};
      if (searchTimerRef.current) {
        globalThis.clearTimeout(searchTimerRef.current);
      }
      mountedRef.current = false;
    };
  }, []);

  // --- Render ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Call Audios
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Loading call audio data...
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
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">Call's audios</h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Manage and review emergency service call audio recordings with transcriptions and evaluations
          </p>
        </div>
        <div className="flex justify-end gap-3 title-adaptive">
          <Button
            onClick={openCreateModal}
            className="btn-outline-fix bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            Upload Audio
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
                placeholder="Search by title, description, or transcription..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={transcriptionFilter}
            onValueChange={(v) => handleTranscriptionFilterChange(v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by transcription" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Audios</SelectItem>
              <SelectItem value="with">With Transcription</SelectItem>
              <SelectItem value="without">Without Transcription</SelectItem>
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
          {transcriptionFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Transcription: {transcriptionFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleTranscriptionFilterChange("all")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Call Audios Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                Records ({totalAudioCalls} total{hasActiveFilters ? ' found' : ''})
              </CardTitle>
              <CardDescription className="text-center text-adaptive-secondary text-sm text-muted-foreground">
                {hasActiveFilters
                  ? `Showing filtered results • Page ${currentPage} of ${totalPages}`
                  : `Overview of all emergency call audio recordings`}
                {totalPages > 1 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    • Showing {audioCalls?.length} of {totalAudioCalls} audio calls
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
            {!isPaginationLoading && audioCalls.length === 0 && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No audio calls found matching your filters.</p>
                      <Button 
                        variant="link" 
                        onClick={clearAllFilters}
                        className="mt-2"
                      >
                        Clear filters to see all audio calls
                      </Button>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No audio calls uploaded yet.</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Table */}
            {audioCalls.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audio File</TableHead>
                    <TableHead>Call Information</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audioCalls?.map((audioCall, index) => {
                    const audioId = String(audioCall.documentId || (audioCall as any).id || (audioCall as any)._id || index);
                    const isPlaying = playingAudioId === audioId;

                    return (
                      <TableRow
                        key={audioId || index}
                        className={`hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlayAudio(audioCall)}
                              disabled={!audioCall.file?.url}
                              className="p-2"
                            >
                              {isPlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {formatFileUrl(audioCall.file || undefined)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {audioCall.file?.url ? 'Audio file' : 'No file'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium">{truncateText(audioCall.description || 'Untitled Call')}</span>
                              <span className="text-xs text-muted-foreground">Call recording</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getTranscriptionBadge(audioCall.transcription || undefined)}
                            {audioCall.rubric && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                Evaluated
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {audioCall.createdAt 
                              ? new Date(audioCall.createdAt).toLocaleDateString('en-GB') 
                              : 'Unknown'
                            }
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedAudioCall(audioCall)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <FileAudio className="h-5 w-5" />
                                    Audio Call Details
                                  </DialogTitle>
                                  <DialogDescription>
                                    Complete call information, transcription and evaluation
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedAudioCall && (
                                  <div className="space-y-6">
                                    {/* Call Information */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                                        <p className="text-sm mt-1">{selectedAudioCall.description || 'No description'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                                        <p className="text-sm mt-1">
                                          {selectedAudioCall.createdAt
                                            ? new Date(selectedAudioCall.createdAt).toLocaleDateString('en-GB', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })
                                            : 'Unknown'
                                          }
                                        </p>
                                      </div>
                                    </div>

                                    {/* Document ID */}
                                    <div>
                                      <Label className="text-sm font-medium text-muted-foreground">Document ID</Label>
                                      <div className="font-mono text-xs">{selectedAudioCall.documentId || 'N/A'}</div>
                                    </div>

                                    {/* Last Updated */}
                                    <div>
                                      <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                                      <p className="text-sm mt-1">
                                        {selectedAudioCall.updatedAt
                                          ? new Date(selectedAudioCall.updatedAt).toLocaleDateString('en-GB', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : 'Never'
                                        }
                                      </p>
                                    </div>

                                    {/* Audio File */}
                                    {selectedAudioCall.file?.url && (
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Audio File</Label>
                                        <div className="mt-2 p-3 border rounded-md">
                                          <audio 
                                            controls 
                                            className="w-full"
                                            src={`${STRAPI_BASE_URL}${selectedAudioCall.file.url}`}
                                          >
                                            <track
                                              kind="captions"
                                              srcLang="en"
                                              label="English captions"
                                            />
                                            Your browser does not support the
                                            audio element.
                                          </audio>
                                          <p className="text-xs text-muted-foreground mt-2">
                                            File: {selectedAudioCall.file.name || selectedAudioCall.file.url}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Transcription */}
                                    <div>
                                      <Label className="text-sm font-medium text-muted-foreground">Transcription</Label>
                                      <div className="mt-2 p-3 border rounded-md bg-muted/30">
                                        <p className="text-sm whitespace-pre-wrap">
                                          {selectedAudioCall.transcription || 'No transcription available'}
                                        </p>
                                      </div>
                                      {selectedAudioCall.transcription && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Character count: {selectedAudioCall.transcription.length}
                                        </p>
                                      )}
                                    </div>

                                    {/* Rubric/Evaluation */}
                                    {selectedAudioCall.rubric && (
                                      <div>
                                        <Label className="text-sm font-medium text-muted-foreground">Evaluation</Label>
                                        <div className="mt-2 p-3 border rounded-md bg-muted/30">
                                          <p className="text-sm whitespace-pre-wrap">
                                            {selectedAudioCall.rubric}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(audioCall)}
                            >
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isDeletingId === audioId}
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
                                    This action cannot be undone. This will permanently delete the audio call:
                                    <br />
                                    <span className="font-medium mt-2 block">
                                      "{audioCall.description || 'Untitled Call'}"
                                    </span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(audioCall)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {isDeletingId === audioId
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
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(((currentPage - 1) * pageSize) + audioCalls.length, totalAudioCalls)} of {totalAudioCalls} results
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

      {/* Audio Call Modal */}
      <AudioCallModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialData={editingAudioCall}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Phone,
  Keyboard,
  ClipboardCheck,
  Mail,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { IProgresStatus, IPublicUser, ProgresStatusSchema } from "@/types";
import { formatKey, formatValue } from "@/utils/formatFunctions";
import { getCandidatesAction, getUserOrgAction } from "@/app/actions";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_QUERY_PARAMS = {
  populate: { role: "*", assessments: "*" },
  sort: "createdAt:desc",
};

export default function CandidatesPage() {
  // Data
  const [candidates, setCandidates] = useState<IPublicUser[]>([]);
  const [availableOrganizations, setAvailableOrganizations] = useState<
    string[]
  >([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaginationLoading, setIsPaginationLoading] =
    useState<boolean>(false);
  const [selectedCandidate, setSelectedCandidate] =
    useState<IPublicUser | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [organizationFilter, setOrganizationFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // Refs for debounce and request ordering
  const searchTimerRef = useRef<number | undefined>(undefined);
  const requestIdRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);

  // Centralized fetch that uses an incrementing request id to ignore out-of-order responses
  const fetchUserData = useCallback(
    async (opts?: {
      page?: number;
      size?: number;
      search?: string;
      status?: string;
      organization?: string;
    }) => {
      const page = opts?.page ?? currentPage;
      const size = opts?.size ?? pageSize;
      const search = opts?.search ?? searchTerm;
      const status = opts?.status ?? statusFilter;
      const organization = opts?.organization ?? organizationFilter;

      setIsPaginationLoading(true);

      // assign request id
      const reqId = ++requestIdRef.current;

      try {
        const response = await getCandidatesAction({
          page,
          pageSize: size,
          search,
          organization,
          progresStatus:
            status !== "all" ? (status as IProgresStatus) : undefined,
          sort: "createdAt:desc",
        });

        // ignore if this is not the latest request or component unmounted
        if (!mountedRef.current || reqId !== requestIdRef.current) return;

        if (response) {
          setCandidates(response.data?.data || []);
          setTotalPages(response.data?.meta?.pagination?.pageCount ?? 1);
          setTotalUsers(response.data?.meta?.pagination?.total ?? 0);
          setCurrentPage(response.data?.meta?.pagination?.page ?? page);
        } else {
          setCandidates([]);
          setTotalPages(1);
          setTotalUsers(0);
        }
      } catch (err) {
        // ignore stale errors if unmounted or outdated
        if (!mountedRef.current || reqId !== requestIdRef.current) return;
        console.error("Error fetching users:", err);
        setCandidates([]);
        setTotalPages(1);
        setTotalUsers(0);
      } finally {
        if (mountedRef.current && reqId === requestIdRef.current) {
          setIsPaginationLoading(false);
        }
      }
    },
    [currentPage, pageSize, searchTerm, statusFilter, organizationFilter]
  );

  // Initial load: organizations + first page
  useEffect(() => {
    mountedRef.current = true;

    const loadInitialData = async () => {
      setIsLoading(true);

      // load organizations (fetch a big page but avoid insane size in case of large DB)
      try {
        const allOrgsResponse = await getUserOrgAction();
        setAvailableOrganizations(
          allOrgsResponse?.data || []
        );
      } catch (err) {
        console.error("Error loading organizations:", err);
      }

      // initial paginated fetch - just call fetchUserData without extra params
      await fetchUserData({ page: DEFAULT_PAGE, size: pageSize });
      setIsLoading(false);
    };

    loadInitialData();

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Re-fetch when page or pageSize changes (keeps current filters) - but avoid on initial load
  useEffect(() => {
    if (!isLoading) {
      fetchUserData({
        page: currentPage,
        size: pageSize,
        search: searchTerm,
        status: statusFilter,
        organization: organizationFilter,
      });
    }
  }, [currentPage, pageSize]); // Removed filters from dependency array to avoid multiple calls

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
        fetchUserData({
          page: 1,
          size: pageSize,
          search: value,
          status: statusFilter,
          organization: organizationFilter,
        });
      }, 400);
    },
    [fetchUserData, pageSize, statusFilter, organizationFilter]
  );

  // Filter handlers
  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setCurrentPage(1);
      fetchUserData({
        page: 1,
        size: pageSize,
        search: searchTerm,
        status: value,
        organization: organizationFilter,
      });
    },
    [fetchUserData, pageSize, searchTerm, organizationFilter]
  );

  const handleOrganizationFilterChange = useCallback(
    (value: string) => {
      setOrganizationFilter(value);
      setCurrentPage(1);
      fetchUserData({
        page: 1,
        size: pageSize,
        search: searchTerm,
        status: statusFilter,
        organization: value,
      });
    },
    [fetchUserData, pageSize, searchTerm, statusFilter]
  );

  const clearAllFilters = useCallback(async () => {
    // clear debounce timer
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = undefined;
    }
    setSearchTerm("");
    setStatusFilter("all");
    setOrganizationFilter("all");
    setCurrentPage(1);
    await fetchUserData({
      page: 1,
      size: pageSize,
      search: "",
      status: "all",
      organization: "all",
    });
  }, [fetchUserData, pageSize]);

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

  // Utilities (kept similar to original)
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case ProgresStatusSchema.Values.Completed:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case ProgresStatusSchema.Values["In progress"]:
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case ProgresStatusSchema.Values["Not started"]:
        return <XCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case ProgresStatusSchema.Values.Completed:
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case ProgresStatusSchema.Values["In progress"]:
        return <Badge variant="secondary">In Progress</Badge>;
      case ProgresStatusSchema.Values["Not started"]:
        return <Badge variant="default">Not started</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }, []);

  const getScoreColor = useCallback((score?: number) => {
    if (!score && score !== 0) return "text-gray-400";
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  }, []);

  const getPerformanceLabel = useCallback((score: number) => {
    if (score >= 85) return "Excellent Performance";
    if (score >= 70) return "Good Performance";
    return "Needs Improvement";
  }, []);

  const getAssessmentIcon = useCallback((type: string) => {
    switch (type) {
      case "typing":
        return <Keyboard className="h-4 w-4" />;
      case "callSimulation":
        return <Phone className="h-4 w-4" />;
      case "situationalJudgement":
        return <ClipboardCheck className="h-4 w-4" />;
      default:
        return null;
    }
  }, []);

  const getAssessmentTitle = useCallback((type: string) => {
    switch (type) {
      case "callSimulation":
        return "Call Simulation";
      case "situationalJudgement":
        return "Situational Judgement";
      case "typing":
        return "Typing Test";
      default:
        return type;
    }
  }, []);

  const organizations = availableOrganizations;
  const hasActiveFilters = useMemo(
    () =>
      !!searchTerm.trim() ||
      statusFilter !== "all" ||
      organizationFilter !== "all",
    [searchTerm, statusFilter, organizationFilter]
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

  // --- Render (kept markup mostly as original, but using the improved handlers/state) ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Candidates
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Loading candidate data...
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
          Candidates
        </h3>
        <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
          Manage and review candidate assessments and results
        </p>
      </div>
      <div className="flex justify-end title-adaptive">
        <Button variant="outline" className="btn-outline-fix">
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
                placeholder="Search by name, lastname, username, or email..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select
            value={statusFilter}
            onValueChange={(v) => handleStatusFilterChange(v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value={ProgresStatusSchema.Values.Completed}>
                Completed
              </SelectItem>
              <SelectItem value={ProgresStatusSchema.Values["In progress"]}>
                In progress
              </SelectItem>
              <SelectItem value={ProgresStatusSchema.Values["Not started"]}>
                Not started
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={organizationFilter}
            onValueChange={(v) => handleOrganizationFilterChange(v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org} value={org}>
                  {org}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Active Filters */}
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
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusFilterChange("all")}
              />
            </Badge>
          )}
          {organizationFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Org: {organizationFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleOrganizationFilterChange("all")}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>
                Records ({totalUsers} total{hasActiveFilters ? ' found' : ''})
              </CardTitle>
              <CardDescription className="text-center text-adaptive-secondary text-sm text-muted-foreground">
                {hasActiveFilters
                  ? `Showing filtered results • Page ${currentPage} of ${totalPages}`
                  : `Overview of all registered candidates and their assessment progress`}
                {totalPages > 1 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    • Showing {candidates?.length} of {totalUsers} users
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {!isPaginationLoading && candidates.length === 0 && (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {hasActiveFilters ? (
                    <>
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No candidates found matching your filters.</p>
                      <Button
                        variant="link"
                        onClick={clearAllFilters}
                        className="mt-2"
                      >
                        Clear filters to see all candidates
                      </Button>
                    </>
                  ) : (
                    <p>No data registered yet.</p>
                  )}
                </div>
              </div>
            )}

            {candidates.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate, index) => {
                    const assessmentArray = Array.isArray(
                      candidate?.assessments
                    )
                      ? candidate.assessments.filter(
                          (a) => typeof a === "object" && a !== null
                        )
                      : [];
                    const completedAssessments = assessmentArray.filter(
                      (a) =>
                        typeof a === "object" &&
                        "progresStatus" in (a as any) &&
                        (a as any).progresStatus === "Completed"
                    ).length;
                    const totalAssessments = assessmentArray.length;

                    return (
                      <TableRow
                        key={candidate.id}
                        className={`hover:bg-muted/50 transition-colors ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }`}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {candidate.firstName} {candidate.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Mail className="h-3 w-3" />
                              {candidate.email}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {candidate.organization || "No organization"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {candidate.role &&
                                typeof candidate.role === "object" &&
                                "name" in candidate.role
                                  ? (candidate.role as any).name
                                  : "No role"}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {getStatusBadge(
                            candidate?.progresStatus ||
                              ProgresStatusSchema.Values["Not started"]
                          )}
                        </TableCell>

                        <TableCell>
                          <span
                            className={`font-medium ${getScoreColor(
                              candidate?.overallScore ?? undefined
                            )}`}
                          >
                            {candidate.overallScore ||
                            candidate.overallScore === 0
                              ? `${candidate.overallScore}%`
                              : "N/A"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {completedAssessments}/{totalAssessments}
                            </span>
                            <div className="flex gap-1">
                              {assessmentArray.length > 0 ? (
                                assessmentArray.map((assessment, idx) => {
                                  if (
                                    typeof assessment === "object" &&
                                    assessment !== null &&
                                    "progresStatus" in assessment
                                  ) {
                                    const typed = assessment as any;
                                    return (
                                      <div
                                        key={typed.id || `${typed.type || 'assessment'}-${candidate.id}-${idx}`}
                                        className="flex items-center gap-1"
                                      >
                                        {getAssessmentIcon(
                                          typed.type || "assessment"
                                        )}
                                        {getStatusIcon(typed.progresStatus)}
                                      </div>
                                    );
                                  }
                                  return null;
                                })
                              ) : (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <span className="text-xs">
                                    No assessments
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCandidate(candidate)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Details
                              </Button>
                            </DialogTrigger>

                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  {selectedCandidate?.firstName}{" "}
                                  {selectedCandidate?.lastName}
                                </DialogTitle>
                                <DialogDescription>
                                  Detailed assessment results and candidate
                                  information
                                </DialogDescription>
                              </DialogHeader>

                              {selectedCandidate && (
                                <div className="space-y-6">
                                  {/* Candidate Info */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">
                                        Candidate Information
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">
                                          Email
                                        </span>
                                        <p>{selectedCandidate.email}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">
                                          Organization
                                        </span>
                                        <p>
                                          {selectedCandidate.organization ||
                                            "No organization"}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">
                                          Role
                                        </span>
                                        <p>
                                          {selectedCandidate.role &&
                                          typeof selectedCandidate.role ===
                                            "object" &&
                                          "name" in selectedCandidate.role
                                            ? (selectedCandidate.role as any)
                                                .name
                                            : "No role"}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-sm font-medium text-muted-foreground">
                                          Registered
                                        </span>
                                        <p>
                                          {selectedCandidate?.createdAt
                                            ? new Date(
                                                selectedCandidate?.createdAt
                                              ).toLocaleDateString("en-GB")
                                            : new Date().toLocaleString(
                                                "en-GB"
                                              )}
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Equality */}
                                  {selectedCandidate?.equalityMonitoring && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">
                                          Equality monitoring
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="grid grid-cols-2 gap-4">
                                        {Object.keys(
                                          selectedCandidate.equalityMonitoring
                                        ).map((key) => (
                                          <div key={key}>
                                            <span className="text-sm font-medium text-muted-foreground">
                                              {formatKey(key)}
                                            </span>
                                            <p>
                                              {formatValue(
                                                (
                                                  selectedCandidate.equalityMonitoring
                                                )[key]
                                              )}
                                            </p>
                                          </div>
                                        ))}
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Assessment Results */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg">
                                        Assessment Results
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      {selectedCandidate?.assessments &&
                                      Array.isArray(
                                        selectedCandidate.assessments
                                      ) &&
                                      selectedCandidate.assessments.length >
                                        0 ? (
                                        selectedCandidate.assessments
                                          .filter(
                                            (a) =>
                                              typeof a === "object" &&
                                              a !== null
                                          )
                                          .map((assessment, idx) => {
                                            const typedAssessment =
                                              assessment as any;
                                            return (
                                              <div
                                                key={typedAssessment.id || `${typedAssessment.type}-${idx}`}
                                                className="border rounded-lg p-4"
                                              >
                                                <div className="flex items-center justify-between mb-2">
                                                  <div className="flex items-center gap-2">
                                                    {getAssessmentIcon(
                                                      typedAssessment.type ||
                                                        "assessment"
                                                    )}
                                                    <h4 className="font-medium capitalize">
                                                      {typedAssessment.type
                                                        ? getAssessmentTitle(typedAssessment.type)
                                                        : "Assessment"}
                                                    </h4>
                                                  </div>

                                                  <div className="flex items-center gap-2">
                                                    {getStatusIcon(
                                                      typedAssessment.progresStatus ||
                                                        "Not started"
                                                    )}
                                                    <Badge
                                                      variant={
                                                        typedAssessment.progresStatus ===
                                                        "Completed"
                                                          ? "default"
                                                          : "secondary"
                                                      }
                                                    >
                                                      {typedAssessment.progresStatus ||
                                                        "Not started"}
                                                    </Badge>
                                                  </div>
                                                </div>

                                                {typedAssessment.progresStatus ===
                                                  "Completed" && (
                                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                                    <div>
                                                      <span className="text-xs font-medium text-muted-foreground">
                                                        Score
                                                      </span>
                                                      <p
                                                        className={`text-lg font-bold ${getScoreColor(
                                                          typedAssessment.score
                                                        )}`}
                                                      >
                                                        {typedAssessment.score ||
                                                          0}
                                                        %
                                                      </p>
                                                    </div>

                                                    {typedAssessment.completedAt && (
                                                      <div>
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                          Completed
                                                        </span>
                                                        <p className="text-sm">
                                                          {new Date(
                                                            typedAssessment.completedAt
                                                          ).toLocaleDateString(
                                                            "en-GB"
                                                          )}
                                                        </p>
                                                      </div>
                                                    )}

                                                    {typedAssessment.type ===
                                                      "typing" &&
                                                      typedAssessment.wpm && (
                                                        <>
                                                          <div>
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                              WPM
                                                            </span>
                                                            <p className="text-sm font-medium">
                                                              {
                                                                typedAssessment.wpm
                                                              }
                                                            </p>
                                                          </div>
                                                          <div>
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                              Accuracy
                                                            </span>
                                                            <p className="text-sm font-medium">
                                                              {
                                                                typedAssessment.accuracy
                                                              }
                                                              %
                                                            </p>
                                                          </div>
                                                        </>
                                                      )}

                                                    {typedAssessment.type ===
                                                      "callSimulation" &&
                                                      typedAssessment.rating && (
                                                        <div>
                                                          <span className="text-xs font-medium text-muted-foreground">
                                                            Rating
                                                          </span>
                                                          <p className="text-sm font-medium">
                                                            {
                                                              typedAssessment.rating
                                                            }
                                                          </p>
                                                        </div>
                                                      )}

                                                    {typedAssessment.type ===
                                                      "situationalJudgement" &&
                                                      typedAssessment.scenarios && (
                                                        <div>
                                                          <span className="text-xs font-medium text-muted-foreground">
                                                            Scenarios
                                                          </span>
                                                          <p className="text-sm font-medium">
                                                            {
                                                              typedAssessment.scenarios
                                                            }
                                                          </p>
                                                        </div>
                                                      )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                      ) : (
                                        <div className="text-center py-4 text-muted-foreground">
                                          No assessment data available
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>

                                  {/* Overall Performance */}
                                  {selectedCandidate.overallScore !==
                                    undefined &&
                                    selectedCandidate.overallScore !== null && (
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">
                                            Overall Performance
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="text-center">
                                            <div
                                              className={`text-4xl font-bold ${getScoreColor(
                                                selectedCandidate.overallScore
                                              )}`}
                                            >
                                              {selectedCandidate.overallScore}%
                                            </div>
                                            <p className="text-muted-foreground mt-2">
                                              {getPerformanceLabel(selectedCandidate.overallScore)}
                                            </p>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
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
                    (currentPage - 1) * pageSize + candidates.length,
                    totalUsers
                  )}{" "}
                  of {totalUsers} results
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
    </div>
  );
}

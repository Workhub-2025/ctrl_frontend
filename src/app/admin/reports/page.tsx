"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  FileText,
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Building,
  Calendar,
  Award,
  Target,
} from "lucide-react";

interface GroupSummary {
  organization: string;
  totalCandidates: number;
  completedAssessments: number;
  averageScore: number;
  passRate: number;
  assessmentTypes: {
    typing: {
      completed: number;
      averageScore: number;
      averageWPM: number;
      averageAccuracy: number;
    };
    callSimulation: {
      completed: number;
      averageScore: number;
      excellentRatings: number;
    };
    situationalJudgement: {
      completed: number;
      averageScore: number;
      averageScenarios: number;
    };
  };
  performanceDistribution: {
    excellent: number; // 85+
    good: number; // 70-84
    needsImprovement: number; // <70
  };
}

interface OverallStats {
  totalOrganizations: number;
  totalCandidates: number;
  totalCompletedAssessments: number;
  overallAverageScore: number;
  overallPassRate: number;
  topPerformingOrganization: string;
  periodRange: string;
}

export default function ReportsPage() {
  const [groupSummaries, setGroupSummaries] = useState<GroupSummary[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedOrganization, setSelectedOrganization] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading report data
    // In real implementation, this would fetch from your API based on filters
    setTimeout(() => {
      const mockGroupSummaries: GroupSummary[] = [
        {
          organization: "Metro Control Room",
          totalCandidates: 45,
          completedAssessments: 38,
          averageScore: 82.5,
          passRate: 84.4,
          assessmentTypes: {
            typing: {
              completed: 38,
              averageScore: 81.2,
              averageWPM: 58.3,
              averageAccuracy: 96.2,
            },
            callSimulation: {
              completed: 35,
              averageScore: 85.1,
              excellentRatings: 28,
            },
            situationalJudgement: {
              completed: 32,
              averageScore: 79.8,
              averageScenarios: 13.2,
            },
          },
          performanceDistribution: {
            excellent: 18,
            good: 14,
            needsImprovement: 6,
          },
        },
        {
          organization: "City Emergency Services",
          totalCandidates: 67,
          completedAssessments: 52,
          averageScore: 77.8,
          passRate: 77.6,
          assessmentTypes: {
            typing: {
              completed: 52,
              averageScore: 76.4,
              averageWPM: 54.7,
              averageAccuracy: 94.8,
            },
            callSimulation: {
              completed: 48,
              averageScore: 80.2,
              excellentRatings: 32,
            },
            situationalJudgement: {
              completed: 45,
              averageScore: 76.8,
              averageScenarios: 12.8,
            },
          },
          performanceDistribution: {
            excellent: 19,
            good: 21,
            needsImprovement: 12,
          },
        },
        {
          organization: "Regional Control Centre",
          totalCandidates: 29,
          completedAssessments: 24,
          averageScore: 85.1,
          passRate: 87.5,
          assessmentTypes: {
            typing: {
              completed: 24,
              averageScore: 83.6,
              averageWPM: 61.2,
              averageAccuracy: 97.1,
            },
            callSimulation: {
              completed: 22,
              averageScore: 87.8,
              excellentRatings: 19,
            },
            situationalJudgement: {
              completed: 21,
              averageScore: 84.0,
              averageScenarios: 14.1,
            },
          },
          performanceDistribution: {
            excellent: 15,
            good: 6,
            needsImprovement: 3,
          },
        },
        {
          organization: "County Emergency Dispatch",
          totalCandidates: 38,
          completedAssessments: 31,
          averageScore: 74.2,
          passRate: 71.0,
          assessmentTypes: {
            typing: {
              completed: 31,
              averageScore: 73.8,
              averageWPM: 51.9,
              averageAccuracy: 93.2,
            },
            callSimulation: {
              completed: 28,
              averageScore: 76.1,
              excellentRatings: 18,
            },
            situationalJudgement: {
              completed: 26,
              averageScore: 72.7,
              averageScenarios: 11.9,
            },
          },
          performanceDistribution: {
            excellent: 8,
            good: 14,
            needsImprovement: 9,
          },
        },
      ];

      const mockOverallStats: OverallStats = {
        totalOrganizations: 4,
        totalCandidates: 179,
        totalCompletedAssessments: 145,
        overallAverageScore: 79.2,
        overallPassRate: 80.0,
        topPerformingOrganization: "Regional Control Centre",
        periodRange: "All Time",
      };

      setGroupSummaries(mockGroupSummaries);
      setOverallStats(mockOverallStats);
      setIsLoading(false);
    }, 1000);
  }, [selectedPeriod, selectedOrganization]);

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 85)
      return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge variant="secondary">Good</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  const getTrendIcon = (score: number, benchmark: number = 75) => {
    if (score > benchmark)
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Reports & Analytics
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Loading report data...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["overall1", "overall2", "overall3", "overall4"].map((key) => (
            <Card key={key} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
        <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
          Reports & Analytics
        </h3>
        <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
          Comprehensive assessment results and organizational performance
          analysis
        </p>
      </div>
      <div className="flex justify-end gap-2 title-adaptive">
        <Button className="btn-outline-fix bg-primary text-primary-foreground hover:bg-primary/90">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
        <Button variant="outline" className="btn-outline-fix">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last-30">Last 30 Days</SelectItem>
              <SelectItem value="last-90">Last 90 Days</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
              <SelectItem value="current-year">Current Year</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={selectedOrganization}
            onValueChange={setSelectedOrganization}
          >
            <SelectTrigger className="w-full sm:w-48">
              <Building className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {groupSummaries.map((summary) => (
                <SelectItem
                  key={summary.organization}
                  value={summary.organization}
                >
                  {summary.organization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Organizations
              </CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallStats.totalOrganizations}
              </div>
              <p className="text-xs text-muted-foreground">
                Active organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Candidates
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallStats.totalCandidates}
              </div>
              <p className="text-xs text-muted-foreground">
                {overallStats.totalCompletedAssessments} completed assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Score
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getPerformanceColor(
                  overallStats.overallAverageScore
                )}`}
              >
                {overallStats.overallAverageScore}%
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {getTrendIcon(overallStats.overallAverageScore)}
                Overall performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getPerformanceColor(
                  overallStats.overallPassRate
                )}`}
              >
                {overallStats.overallPassRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {overallStats.topPerformingOrganization} leads
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organization Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Organization Performance Summary
          </CardTitle>
          <CardDescription>
            Comparative analysis of assessment results across organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Candidates</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Average Score</TableHead>
                <TableHead>Pass Rate</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupSummaries
                .filter(
                  (summary) =>
                    selectedOrganization === "all" ||
                    summary.organization === selectedOrganization
                )
                .sort((a, b) => b.averageScore - a.averageScore)
                .map((summary) => (
                  <TableRow key={summary.organization}>
                    <TableCell>
                      <div className="font-medium">{summary.organization}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">
                          {summary.totalCandidates}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">
                          {summary.completedAssessments}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(
                            (summary.completedAssessments /
                              summary.totalCandidates) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`font-medium ${getPerformanceColor(
                          summary.averageScore
                        )}`}
                      >
                        {summary.averageScore}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className={`font-medium ${getPerformanceColor(
                          summary.passRate
                        )}`}
                      >
                        {summary.passRate}%
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPerformanceBadge(summary.averageScore)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Assessment Breakdown */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groupSummaries
          .filter(
            (summary) =>
              selectedOrganization === "all" ||
              summary.organization === selectedOrganization
          )
          .map((summary) => (
            <Card key={summary.organization}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {summary.organization}
                </CardTitle>
                <CardDescription>
                  Detailed assessment breakdown and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance Distribution */}
                <div>
                  <h4 className="font-medium mb-2">Performance Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">
                        Excellent (85+)
                      </span>
                      <Badge className="bg-green-100 text-green-800">
                        {summary.performanceDistribution.excellent}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-yellow-600">
                        Good (70-84)
                      </span>
                      <Badge variant="secondary">
                        {summary.performanceDistribution.good}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600">
                        Needs Work (&lt;70)
                      </span>
                      <Badge variant="destructive">
                        {summary.performanceDistribution.needsImprovement}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Assessment Type Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-medium">Assessment Details</h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Typing Test</span>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${getPerformanceColor(
                            summary.assessmentTypes.typing.averageScore
                          )}`}
                        >
                          {summary.assessmentTypes.typing.averageScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {summary.assessmentTypes.typing.averageWPM} WPM
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Call Simulation</span>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${getPerformanceColor(
                            summary.assessmentTypes.callSimulation.averageScore
                          )}`}
                        >
                          {summary.assessmentTypes.callSimulation.averageScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {
                            summary.assessmentTypes.callSimulation
                              .excellentRatings
                          }{" "}
                          excellent
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Situational Judgement</span>
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${getPerformanceColor(
                            summary.assessmentTypes.situationalJudgement
                              .averageScore
                          )}`}
                        >
                          {
                            summary.assessmentTypes.situationalJudgement
                              .averageScore
                          }
                          %
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {
                            summary.assessmentTypes.situationalJudgement
                              .averageScenarios
                          }{" "}
                          scenarios
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

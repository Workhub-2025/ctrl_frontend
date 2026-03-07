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
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Download,
  RefreshCw,
} from "lucide-react";

interface AnalyticsData {
  assessmentTrends: {
    period: string;
    typing: number;
    callSimulation: number;
    situationalJudgement: number;
    total: number;
  }[];
  performanceMetrics: {
    currentPeriod: {
      averageScore: number;
      passRate: number;
      completionRate: number;
      candidateCount: number;
    };
    previousPeriod: {
      averageScore: number;
      passRate: number;
      completionRate: number;
      candidateCount: number;
    };
  };
  organizationBreakdown: {
    name: string;
    candidates: number;
    averageScore: number;
    completionRate: number;
  }[];
  assessmentTypeAnalysis: {
    typing: {
      totalCompleted: number;
      averageScore: number;
      averageWPM: number;
      passRate: number;
    };
    callSimulation: {
      totalCompleted: number;
      averageScore: number;
      excellentRatingsPercentage: number;
      passRate: number;
    };
    situationalJudgement: {
      totalCompleted: number;
      averageScore: number;
      averageScenariosCompleted: number;
      passRate: number;
    };
  };
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState("last-30");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeframe]);

  const loadAnalyticsData = () => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const mockData: AnalyticsData = {
        assessmentTrends: [
          {
            period: "Week 1",
            typing: 45,
            callSimulation: 38,
            situationalJudgement: 32,
            total: 115,
          },
          {
            period: "Week 2",
            typing: 52,
            callSimulation: 44,
            situationalJudgement: 39,
            total: 135,
          },
          {
            period: "Week 3",
            typing: 48,
            callSimulation: 41,
            situationalJudgement: 35,
            total: 124,
          },
          {
            period: "Week 4",
            typing: 58,
            callSimulation: 49,
            situationalJudgement: 43,
            total: 150,
          },
        ],
        performanceMetrics: {
          currentPeriod: {
            averageScore: 79.2,
            passRate: 78.5,
            completionRate: 84.2,
            candidateCount: 203,
          },
          previousPeriod: {
            averageScore: 76.8,
            passRate: 75.3,
            completionRate: 81.7,
            candidateCount: 189,
          },
        },
        organizationBreakdown: [
          {
            name: "Metro Control Room",
            candidates: 65,
            averageScore: 82.5,
            completionRate: 87.3,
          },
          {
            name: "City Emergency Services",
            candidates: 89,
            averageScore: 77.8,
            completionRate: 82.1,
          },
          {
            name: "Regional Control Centre",
            candidates: 34,
            averageScore: 85.1,
            completionRate: 91.2,
          },
          {
            name: "County Emergency Dispatch",
            candidates: 45,
            averageScore: 74.2,
            completionRate: 78.9,
          },
        ],
        assessmentTypeAnalysis: {
          typing: {
            totalCompleted: 187,
            averageScore: 78.4,
            averageWPM: 56.2,
            passRate: 79.1,
          },
          callSimulation: {
            totalCompleted: 162,
            averageScore: 81.3,
            excellentRatingsPercentage: 64.2,
            passRate: 82.7,
          },
          situationalJudgement: {
            totalCompleted: 149,
            averageScore: 77.9,
            averageScenariosCompleted: 13.2,
            passRate: 76.5,
          },
        },
      };

      setAnalyticsData(mockData);
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 1000);
  };

  const calculateTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change),
      direction: change >= 0 ? "up" : "down",
      isPositive: change >= 0,
    };
  };

  const getTrendIcon = (direction: string, isPositive: boolean) => {
    if (direction === "up") {
      return (
        <TrendingUp
          className={`h-4 w-4 ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        />
      );
    }
    return (
      <TrendingDown
        className={`h-4 w-4 ${isPositive ? "text-green-600" : "text-red-600"}`}
      />
    );
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Analytics Dashboard
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Loading analytics data...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["metric1", "metric2", "metric3", "metric4"].map((key) => (
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

  if (!analyticsData) return null;

  const scoresTrend = calculateTrend(
    analyticsData.performanceMetrics.currentPeriod.averageScore,
    analyticsData.performanceMetrics.previousPeriod.averageScore
  );

  const passRateTrend = calculateTrend(
    analyticsData.performanceMetrics.currentPeriod.passRate,
    analyticsData.performanceMetrics.previousPeriod.passRate
  );

  const completionTrend = calculateTrend(
    analyticsData.performanceMetrics.currentPeriod.completionRate,
    analyticsData.performanceMetrics.previousPeriod.completionRate
  );

  const candidatesTrend = calculateTrend(
    analyticsData.performanceMetrics.currentPeriod.candidateCount,
    analyticsData.performanceMetrics.previousPeriod.candidateCount
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
        <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
          Analytics Dashboard
        </h3>
        <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
          Real-time insights and performance trends across all assessments
        </p>
      </div>
      <div className="flex justify-end gap-2 title-adaptive">
        <Button
          variant="outline"
          onClick={() => loadAnalyticsData()}
          className="btn-outline-fix bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" className="btn-outline-fix">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analytics Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Select
              value={selectedTimeframe}
              onValueChange={setSelectedTimeframe}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7">Last 7 Days</SelectItem>
                <SelectItem value="last-30">Last 30 Days</SelectItem>
                <SelectItem value="last-90">Last 90 Days</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString("en-GB")}
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getPerformanceColor(
                analyticsData.performanceMetrics.currentPeriod.averageScore
              )}`}
            >
              {analyticsData.performanceMetrics.currentPeriod.averageScore}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon(scoresTrend.direction, scoresTrend.isPositive)}
              {scoresTrend.value.toFixed(1)}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getPerformanceColor(
                analyticsData.performanceMetrics.currentPeriod.passRate
              )}`}
            >
              {analyticsData.performanceMetrics.currentPeriod.passRate}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon(passRateTrend.direction, passRateTrend.isPositive)}
              {passRateTrend.value.toFixed(1)}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData.performanceMetrics.currentPeriod.completionRate}%
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon(
                completionTrend.direction,
                completionTrend.isPositive
              )}
              {completionTrend.value.toFixed(1)}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Candidates
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.performanceMetrics.currentPeriod.candidateCount}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {getTrendIcon(
                candidatesTrend.direction,
                candidatesTrend.isPositive
              )}
              {candidatesTrend.value.toFixed(0)} from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Completion Trends</CardTitle>
          <CardDescription>
            Weekly breakdown of assessment completions by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.assessmentTrends.map((trend, index) => (
              <div key={trend.period}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{trend.period}</span>
                  <span className="text-sm text-muted-foreground">
                    Total: {trend.total}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-1">
                      Typing
                    </Badge>
                    <div className="text-lg font-bold">{trend.typing}</div>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="mb-1">
                      Call Sim
                    </Badge>
                    <div className="text-lg font-bold">
                      {trend.callSimulation}
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="mb-1">
                      Situational
                    </Badge>
                    <div className="text-lg font-bold">
                      {trend.situationalJudgement}
                    </div>
                  </div>
                </div>
                {index < analyticsData.assessmentTrends.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organization Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Performance Comparison</CardTitle>
          <CardDescription>
            Comparative analysis across all registered organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.organizationBreakdown
              .sort((a, b) => b.averageScore - a.averageScore)
              .map((org, index) => (
                <div
                  key={org.name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${(() => {
                        if (index === 0) return "bg-yellow-100 text-yellow-800";
                        if (index === 1) return "bg-gray-100 text-gray-800";
                        if (index === 2) return "bg-orange-100 text-orange-800";
                        return "bg-blue-100 text-blue-800";
                      })()}`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {org.candidates} candidates
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${getPerformanceColor(
                        org.averageScore
                      )}`}
                    >
                      {org.averageScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {org.completionRate}% completion
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Type Analysis */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Typing Test</CardTitle>
            <CardDescription>
              Performance metrics and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Completed</span>
              <span className="font-medium">
                {analyticsData.assessmentTypeAnalysis.typing.totalCompleted}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average Score</span>
              <span
                className={`font-medium ${getPerformanceColor(
                  analyticsData.assessmentTypeAnalysis.typing.averageScore
                )}`}
              >
                {analyticsData.assessmentTypeAnalysis.typing.averageScore}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average WPM</span>
              <span className="font-medium">
                {analyticsData.assessmentTypeAnalysis.typing.averageWPM}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Pass Rate</span>
              <span
                className={`font-medium ${getPerformanceColor(
                  analyticsData.assessmentTypeAnalysis.typing.passRate
                )}`}
              >
                {analyticsData.assessmentTypeAnalysis.typing.passRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Call Simulation</CardTitle>
            <CardDescription>
              Performance metrics and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Completed</span>
              <span className="font-medium">
                {
                  analyticsData.assessmentTypeAnalysis.callSimulation
                    .totalCompleted
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average Score</span>
              <span
                className={`font-medium ${getPerformanceColor(
                  analyticsData.assessmentTypeAnalysis.callSimulation
                    .averageScore
                )}`}
              >
                {
                  analyticsData.assessmentTypeAnalysis.callSimulation
                    .averageScore
                }
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Excellent Ratings</span>
              <span className="font-medium">
                {
                  analyticsData.assessmentTypeAnalysis.callSimulation
                    .excellentRatingsPercentage
                }
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Pass Rate</span>
              <span
                className={`font-medium ${getPerformanceColor(
                  analyticsData.assessmentTypeAnalysis.callSimulation.passRate
                )}`}
              >
                {analyticsData.assessmentTypeAnalysis.callSimulation.passRate}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Situational Judgement</CardTitle>
            <CardDescription>
              Performance metrics and statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Completed</span>
              <span className="font-medium">
                {
                  analyticsData.assessmentTypeAnalysis.situationalJudgement
                    .totalCompleted
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Average Score</span>
              <span
                className={`font-medium ${getPerformanceColor(
                  analyticsData.assessmentTypeAnalysis.situationalJudgement
                    .averageScore
                )}`}
              >
                {
                  analyticsData.assessmentTypeAnalysis.situationalJudgement
                    .averageScore
                }
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Scenarios</span>
              <span className="font-medium">
                {
                  analyticsData.assessmentTypeAnalysis.situationalJudgement
                    .averageScenariosCompleted
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Pass Rate</span>
              <span
                className={`font-medium ${getPerformanceColor(
                  analyticsData.assessmentTypeAnalysis.situationalJudgement
                    .passRate
                )}`}
              >
                {
                  analyticsData.assessmentTypeAnalysis.situationalJudgement
                    .passRate
                }
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

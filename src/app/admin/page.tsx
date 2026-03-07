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
import { Separator } from "@/components/ui/separator";
import {
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { getUserStatsAction } from "../actions/users.actions";

interface DashboardStats {
  totalCandidates: number;
  completedAssessments: number;
  pendingAssessments: number;
  averageScore: number;
  totalAssessments: number;
  recentActivity: {
    id: string;
    candidateName: string;
    assessmentType: string;
    completedAt: string;
    score: number;
    status: "completed" | "in-progress" | "pending";
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCandidates: 0,
    completedAssessments: 0,
    pendingAssessments: 0,
    averageScore: 0,
    totalAssessments: 0,
    recentActivity: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetcchStats = async () => {
    try {
      const response = await getUserStatsAction();
      console.log("Users stats::", response);
      return response;
    } catch (error) {
      console.error("❌ [Frontend] Error fetching users:", error);
      return null;
    }
  };

  useEffect(() => {
    // Simulate loading dashboard data
    // In real implementation, this would fetch from your API

    const loadInitialData = async () => {
      setIsLoading(true);
      const stats = await fetcchStats();

      setStats({
        totalCandidates: stats?.data?.total || 0,
        completedAssessments: 189,
        pendingAssessments: 58,
        averageScore: 78.5,
        totalAssessments: 247,
        recentActivity: [
          {
            id: "1",
            candidateName: "Sarah Johnson",
            assessmentType: "Typing Test",
            completedAt: "2025-09-25T10:30:00Z",
            score: 85,
            status: "completed",
          },
          {
            id: "2",
            candidateName: "Michael Chen",
            assessmentType: "Call Simulation",
            completedAt: "2025-09-25T09:15:00Z",
            score: 92,
            status: "completed",
          },
          {
            id: "3",
            candidateName: "Emma Wilson",
            assessmentType: "Situational Judgement",
            completedAt: "2025-09-25T08:45:00Z",
            score: 76,
            status: "completed",
          },
          {
            id: "4",
            candidateName: "David Rodriguez",
            assessmentType: "Typing Test",
            completedAt: "2025-09-24T16:20:00Z",
            score: 68,
            status: "completed",
          },
          {
            id: "5",
            candidateName: "Lisa Thompson",
            assessmentType: "Call Simulation",
            completedAt: "2025-09-24T15:10:00Z",
            score: 88,
            status: "completed",
          },
        ],
      });
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Dashboard
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Loading dashboard statistics...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["candidates", "completed", "pending", "average"].map((type) => (
            <Card key={type} className="animate-pulse">
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
          Dashboard
        </h3>
        <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
          Overview of assessment platform performance and candidate activity
        </p>
      </div>
      </div>

      {/* Key Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Candidates
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Assessments
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completedAssessments}
            </div>
            <p className="text-xs text-muted-foreground">
              {(
                (stats.completedAssessments / stats.totalAssessments) *
                100
              ).toFixed(1)}
              % completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Assessments
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingAssessments}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks and navigation
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button asChild className="h-auto p-4 flex-col gap-2">
            <Link href="/admin/candidates">
              <Users className="h-6 w-6" />
              <span>View All Candidates</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
          >
            <Link href="/admin/reports">
              <FileText className="h-6 w-6" />
              <span>Generate Reports</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
          >
            <Link href="/admin/analytics">
              <BarChart3 className="h-6 w-6" />
              <span>View Analytics</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-4 flex-col gap-2"
          >
            <Link href="/admin/system">
              <AlertTriangle className="h-6 w-6" />
              <span>System Settings</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-2xl font-semibold leading-none tracking-tight">
              Recent Activity
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Latest assessment completions and candidate activity
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/candidates">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col space-y-1.5">
          <div className="space-y-4">
            {stats.recentActivity.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(activity.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {activity.candidateName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.assessmentType} •{" "}
                        {new Date(activity.completedAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        activity.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {activity.status}
                    </Badge>
                    {activity.status === "completed" && (
                      <span
                        className={`text-sm font-medium ${getScoreColor(
                          activity.score
                        )}`}
                      >
                        {activity.score}%
                      </span>
                    )}
                  </div>
                </div>
                {index < stats.recentActivity.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

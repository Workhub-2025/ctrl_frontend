"use client";

import { useState } from "react";
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
  Database,
  Server,
  Settings,
  Users,
  AlertTriangle,
  CheckCircle,
  Activity,
  HardDrive,
  Cpu,
  Globe,
  Lock,
  FileText,
} from "lucide-react";

export default function SystemPage() {
  const [isLoading] = useState(false);

  const systemStats = {
    uptime: "15 days, 7 hours",
    totalUsers: 247,
    activeUsers: 189,
    databaseSize: "2.4 GB",
    storageUsed: "12.8 GB",
    storageTotal: "100 GB",
    cpuUsage: 23,
    memoryUsage: 67,
    networkStatus: "operational",
    backupStatus: "completed",
    lastBackup: "2025-09-25T02:00:00Z",
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <Badge className="bg-green-100 text-green-800">Operational</Badge>
        );
      case "warning":
        return <Badge variant="secondary">Warning</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 80) return "text-red-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-green-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            System Management
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            Loading system information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
        <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
          System Management
        </h3>
        <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
          Monitor system health, manage platform settings, and view operational
          status
        </p>
      </div>
      <div className="flex justify-end gap-2 title-adaptive">
        <Button className="btn-outline-fix bg-primary text-primary-foreground hover:bg-primary/90">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button variant="outline" className="btn-outline-fix">
          <FileText className="h-4 w-4 mr-2" />
          Logs
        </Button>
      </div>
      </div>

      {/* System Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-lg font-semibold text-green-600">
                Online
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemStats.uptime}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              of {systemStats.totalUsers} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.databaseSize}</div>
            <p className="text-xs text-muted-foreground">
              Assessment data & user records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.storageUsed}</div>
            <p className="text-xs text-muted-foreground">
              of {systemStats.storageTotal} available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Performance */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance</CardTitle>
          <CardDescription>
            Real-time monitoring of system resources and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="text-sm font-medium">CPU Usage</span>
                </div>
                <span
                  className={`text-sm font-medium ${getUsageColor(
                    systemStats.cpuUsage
                  )}`}
                >
                  {systemStats.cpuUsage}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${(() => {
                    if (systemStats.cpuUsage >= 80) return "bg-red-500";
                    if (systemStats.cpuUsage >= 60) return "bg-yellow-500";
                    return "bg-green-500";
                  })()}`}
                  style={{ width: `${systemStats.cpuUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <span
                  className={`text-sm font-medium ${getUsageColor(
                    systemStats.memoryUsage
                  )}`}
                >
                  {systemStats.memoryUsage}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${(() => {
                    if (systemStats.memoryUsage >= 80) return "bg-red-500";
                    if (systemStats.memoryUsage >= 60) return "bg-yellow-500";
                    return "bg-green-500";
                  })()}`}
                  style={{ width: `${systemStats.memoryUsage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Services */}
      <Card>
        <CardHeader>
          <CardTitle>System Services</CardTitle>
          <CardDescription>
            Status of critical platform services and components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Web Server</div>
                  <div className="text-sm text-muted-foreground">
                    Next.js Application
                  </div>
                </div>
              </div>
              {getStatusBadge("operational")}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Database</div>
                  <div className="text-sm text-muted-foreground">
                    Strapi Backend
                  </div>
                </div>
              </div>
              {getStatusBadge("operational")}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Network</div>
                  <div className="text-sm text-muted-foreground">
                    External Connectivity
                  </div>
                </div>
              </div>
              {getStatusBadge(systemStats.networkStatus)}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Authentication</div>
                  <div className="text-sm text-muted-foreground">
                    NextAuth Service
                  </div>
                </div>
              </div>
              {getStatusBadge("operational")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Maintenance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Backup Status</CardTitle>
            <CardDescription>
              Automated backup schedule and recovery information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Backup Status</span>
              {getStatusBadge(systemStats.backupStatus)}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Backup</span>
              <span className="text-sm text-muted-foreground">
                {new Date(systemStats.lastBackup).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Backup Schedule</span>
              <span className="text-sm text-muted-foreground">
                Daily at 2:00 AM
              </span>
            </div>

            <Separator />

            <Button variant="outline" className="w-full">
              <Database className="h-4 w-4 mr-2" />
              Run Manual Backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Maintenance</CardTitle>
            <CardDescription>
              Platform maintenance tasks and system updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Database optimization completed</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Security patches up to date</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">Scheduled maintenance in 3 days</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                System Configuration
              </Button>
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks and system operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              View System Logs
            </Button>

            <Button variant="outline" className="justify-start">
              <Database className="h-4 w-4 mr-2" />
              Database Management
            </Button>

            <Button variant="outline" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              User Administration
            </Button>

            <Button variant="outline" className="justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Platform Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

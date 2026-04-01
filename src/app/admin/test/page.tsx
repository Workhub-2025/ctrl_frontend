"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, CheckCircle } from "lucide-react";
import { isAdminRole } from "@/lib/auth/role-model";

export default function AdminTestPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Access Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-600 font-medium">
                Admin access confirmed - you can view this page!
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Current User Info:</span>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {session?.user?.name || "N/A"}
                  </span>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {session?.user?.email || "N/A"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  <Badge
                    variant={
                      isAdminRole(session?.user?.role) ? "default" : "secondary"
                    }
                  >
                    {session?.user?.role || "N/A"}
                  </Badge>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground">
                    User ID:
                  </span>
                  <span className="ml-2 font-mono text-sm text-foreground">
                    {session?.user?.id || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                This page is only accessible to users with admin role. The
                middleware protects this route and would redirect non-admin
                users to the dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

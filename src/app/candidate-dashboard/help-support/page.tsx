import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ticket, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

/**
 * HelpSupportPage
 * 
 * Provides Candidates with options to raise support tickets or contact the Hiring Manager.
 */
export default function HelpSupportPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <DashboardPageHeader 
        title="Help & Support" 
        description="Get assistance with your assessment process." 
      />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Raise an IT Ticket</CardTitle>
            <CardDescription>Report technical issues with the platform.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full">Create Ticket</Button></CardContent>
        </Card>
        <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Contact Hiring Manager</CardTitle>
            <CardDescription>Questions about the recruitment process.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" asChild>
              <a href="mailto:hiring@ctrl.local?subject=CTRL%20Candidate%20Query">Send Email</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

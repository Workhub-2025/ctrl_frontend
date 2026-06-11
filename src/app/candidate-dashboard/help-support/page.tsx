import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ticket, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

/**
 * HelpSupportPage
 * 
 * Provides Candidates with options to raise support tickets or contact the Hiring Manager.
 */
export default function HelpSupportPage() {
  return (
    <div className="max-w-7xl space-y-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-500">
      <HiringManagerPageHeader 
        eyebrow="Help & Support"
        title="Help & Support" 
        description="Get assistance with your assessment process or report technical issues." 
        icon={Ticket}
      />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg">Raise an IT Ticket</CardTitle>
            <CardDescription>Report technical issues with the platform.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">Create Ticket</Button></CardContent>
        </Card>
        <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg">Contact Hiring Manager</CardTitle>
            <CardDescription>Questions about the recruitment process.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/10 dark:hover:!text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" variant="outline" asChild>
              <a href="mailto:hiring@ctrl.local?subject=CTRL%20Candidate%20Query">Send Email</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
        <Card className="relative overflow-hidden rounded-xl border border-border bg-card dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md shadow-lg p-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-indigo-500" />
          <CardHeader className="p-0 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
              <Ticket className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg font-bold text-foreground">Raise an IT Ticket</CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-0.5">Report technical difficulties or platform issues directly to our engineering support desk.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-6">
            <Button className="w-full h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-primary text-white font-bold text-sm hover:from-indigo-400 hover:to-primary/90 transition-all shadow-[0_4px_15px_rgba(99,102,241,0.15)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              Create Ticket
            </Button>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-xl border border-border bg-card dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md shadow-lg p-6">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-400" />
          <CardHeader className="p-0 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-sm">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-lg font-bold text-foreground">Contact Hiring Manager</CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-0.5">Questions regarding the interview process, job role criteria, or your application status.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-6">
            <Button className="w-full h-10 rounded-lg border-white/15 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" variant="outline" asChild>
              <a href="mailto:hiring@ctrl.local?subject=CTRL%20Candidate%20Query">Send Email</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

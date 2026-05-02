import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

/**
 * NextStepsPage
 * 
 * Informs the candidate about the post-assessment review process.
 */
export default function NextStepsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <DashboardPageHeader 
        title="Next Steps" 
        description="What to expect after completion." 
      />
      
      <Card className="border-border dark:border-white/5 bg-card dark:bg-[#080c16]/50 shadow-sm dark:shadow-none">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg">Secure Review Process</CardTitle>
          <CardDescription>Your assessments are safe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" /><p className="text-muted-foreground">Responses are encrypted and securely submitted.</p></div>
          <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" /><p className="text-muted-foreground">Our AI hybrid scoring processes your results for the hiring manager.</p></div>
          <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" /><p className="text-muted-foreground">The recruitment team will contact you directly with next steps.</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
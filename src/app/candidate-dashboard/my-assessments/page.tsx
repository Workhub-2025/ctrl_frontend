import { redirect } from "next/navigation";

export default async function MyAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const session = resolvedParams?.session;

  if (session && typeof session === "string") {
    redirect(`/candidate-dashboard?session=${encodeURIComponent(session)}`);
  }

  redirect("/candidate-dashboard");
}


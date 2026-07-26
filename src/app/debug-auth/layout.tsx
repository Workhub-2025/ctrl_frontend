import { notFound } from "next/navigation";

export default function DebugAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return children;
}

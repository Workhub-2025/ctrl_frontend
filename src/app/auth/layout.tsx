import { PublicAuthProvider } from "@/components/auth/public-auth-provider";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicAuthProvider>
      {children}
    </PublicAuthProvider>
  );
}

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email ?? "your inbox";
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="font-serif text-3xl">Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to <strong>{email}</strong>. Click it to sign in — it expires in
            15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Didn&apos;t get it? Check your spam folder or try again.
          </p>
          <Button variant="outline" asChild>
            <Link href="/signup">Try a different address</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

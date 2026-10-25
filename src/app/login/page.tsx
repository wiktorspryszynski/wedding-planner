import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center font-display text-4xl font-medium">Nasz ślub</h1>
        <p className="mb-8 text-center text-sm text-muted">Wszystko w jednym miejscu.</p>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}

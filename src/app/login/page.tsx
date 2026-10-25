import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { Suspense } from "react";
import { WeddingDate } from "@/components/wedding-date";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-center font-display text-4xl leading-tight font-medium">
          Spryszyński
          <br />
          <span className="text-gold">&amp;</span> Guzowska
        </h1>
        <div className="mt-3 mb-8 flex h-5 justify-center">
          <Suspense>
            <WeddingDate className="text-sm" />
          </Suspense>
        </div>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}

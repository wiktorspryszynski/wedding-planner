import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { BRAND } from "@/lib/brand";
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
        <p className="mt-2 mb-8 text-center text-sm text-muted italic">{BRAND.tagline}</p>
        <Card>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}

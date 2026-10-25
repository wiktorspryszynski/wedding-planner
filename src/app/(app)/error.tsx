"use client";

import { Button, Card } from "@/components/ui";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="max-w-lg">
      <h2 className="font-display text-xl">Coś poszło nie tak</h2>
      <p className="mt-2 text-sm text-muted">{error.message}</p>
      <Button className="mt-4" onClick={reset}>
        Spróbuj ponownie
      </Button>
    </Card>
  );
}

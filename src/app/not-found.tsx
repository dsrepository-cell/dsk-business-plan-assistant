import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-semibold">Not found</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        This case doesn&apos;t exist or belongs to another DSK centre.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to cases</Link>
      </Button>
    </main>
  );
}

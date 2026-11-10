import { ArrowRight, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* Landing screen ported from prototype step 0. The button is wired to the wizard in Phase 2/4. */
export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <div className="py-14 text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary">
          <ClipboardList className="size-[26px] text-white" />
        </div>
        <h1 className="mb-3 font-display text-3xl font-semibold">DSK Business Plan Assistant</h1>
        <p className="mx-auto mb-9 max-w-sm text-[15px] text-muted-foreground">
          Products, costing, expenses, location, 3-year projections, marketing plan and SWOT — all in one guided flow. No
          financial modelling needed.
        </p>
        <Button variant="accent" size="lg" disabled>
          Start a new entrepreneur <ArrowRight />
        </Button>
        <p className="mt-8 text-xs text-[#93a199]">Access Livelihoods · Digital Seva Kendra</p>
      </div>
    </main>
  );
}

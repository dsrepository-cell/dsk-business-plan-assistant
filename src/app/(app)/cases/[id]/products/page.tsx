import { notFound } from 'next/navigation';
import { StepHeader } from '@/components/step-header';
import { loadCaseFinance } from '@/lib/case-finance';
import { productDraft } from '@/lib/finance-rows';
import { saveProducts } from './actions';
import { ProductsForm } from './products-form';

export const metadata = { title: 'Products & costing · DSK Business Plan Assistant' };

export default async function ProductsStep({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await loadCaseFinance(id);
  if (!f) notFound();

  return (
    <div>
      <StepHeader
        step="products"
        title="Products & costing"
        subtitle={
          f.biz.stage === 'new'
            ? 'Add every product or service she plans to sell. These numbers become the Year 1 plan.'
            : 'Add every product or service she sells — this drives the revenue and profit calculations automatically.'
        }
        sector={f.biz.sectors}
        name={f.biz.entrepreneurs?.full_name ?? null}
      />
      <ProductsForm
        action={saveProducts.bind(null, f.biz.id)}
        initial={f.rows.products.map(productDraft)}
        defaultUnit={f.biz.sectors?.default_unit ?? null}
        expenses={f.engine.expenses}
        loan={f.engine.loan}
      />
    </div>
  );
}

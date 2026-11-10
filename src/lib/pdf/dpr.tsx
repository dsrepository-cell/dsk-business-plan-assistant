import 'server-only';
import path from 'node:path';
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { PlanContext } from '@/lib/ai/context';
import type { Narrative } from '@/lib/ai/prompts';
import { yearlyDebtService, type buildSnapshot } from '@/lib/engine';
import { formatINR } from '@/lib/utils';

/**
 * The Detailed Project Report (DPR) PDF — the 30 sections of kit/00_START_HERE.md, in order.
 * Numbers come ONLY from the frozen engine snapshot; prose only from the stored narrative.
 * Noto fonts are embedded so Telugu, Hindi (Devanagari) and Kannada text — and the ₹ sign — render.
 * Until a reviewer approves the version, every page carries a "DRAFT" watermark.
 */
type Snapshot = ReturnType<typeof buildSnapshot>;
export type DprInput = {
  version: number;
  status: string;
  approvedAt: string | null;
  createdAt: string;
  writtenWith: string; // "standard-wording" or the AI model id
  engine: Snapshot;
  context: PlanContext;
  narrative: Narrative;
};

const FONT_DIR = path.join(process.cwd(), 'src/assets/fonts');
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const fam = (family: string, file: string) =>
    Font.register({
      family,
      fonts: [
        { src: path.join(FONT_DIR, `${file}_400Regular.ttf`), fontWeight: 400 },
        { src: path.join(FONT_DIR, `${file}_700Bold.ttf`), fontWeight: 700 },
      ],
    });
  fam('NotoSans', 'NotoSans');
  fam('NotoSansTelugu', 'NotoSansTelugu');
  fam('NotoSansDevanagari', 'NotoSansDevanagari');
  fam('NotoSansKannada', 'NotoSansKannada');
  Font.registerHyphenationCallback((word) => [word]); // never split words (breaks Indic scripts)
  fontsReady = true;
}
// Latin first, then the Indic scripts: each character is drawn with the first font that has it.
const FAMILY = ['NotoSans', 'NotoSansTelugu', 'NotoSansDevanagari', 'NotoSansKannada'];

const C = { ink: '#1f2a24', muted: '#5b6b62', primary: '#1f4b3f', soft: '#e8f0ec', line: '#d6ded9', warn: '#7a5c0a' };
const s = StyleSheet.create({
  page: { fontFamily: FAMILY, fontSize: 9.5, color: C.ink, paddingTop: 54, paddingBottom: 54, paddingHorizontal: 44, lineHeight: 1.45 },
  header: { position: 'absolute', top: 22, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.muted },
  footer: { position: 'absolute', bottom: 22, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.muted },
  watermark: { position: 'absolute', top: 330, left: 60, fontSize: 110, fontWeight: 700, color: '#c0392b', opacity: 0.09, transform: 'rotate(-35deg)' },
  h1: { fontSize: 22, fontWeight: 700, color: C.primary, lineHeight: 1.25, marginBottom: 8 },
  h2: { fontSize: 12, fontWeight: 700, color: C.primary, marginTop: 12, marginBottom: 5 },
  p: { marginBottom: 4 },
  small: { fontSize: 8, color: C.muted },
  kvRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 2.5 },
  kvKey: { width: '45%', color: C.muted },
  kvVal: { width: '55%' },
  table: { borderWidth: 0.5, borderColor: C.line, marginBottom: 6 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.line },
  th: { backgroundColor: C.soft, fontWeight: 700 },
  td: { paddingVertical: 2.5, paddingHorizontal: 4, flexGrow: 1, flexBasis: 0 },
  num: { textAlign: 'right' },
  bullet: { flexDirection: 'row', marginBottom: 2 },
  note: { backgroundColor: C.soft, padding: 6, marginBottom: 6, fontSize: 8.5 },
});

const pct = (v: number | null | undefined) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
const dscrTxt = (v: number | null | undefined) => (v == null ? '—' : `${Number(v).toFixed(2)}×`);
const txt = (v: unknown) => (v == null || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : String(v));

function H({ n, children }: { n: number; children: string }) {
  return <Text style={s.h2} minPresenceAhead={60}>{`${n}. ${children}`}</Text>;
}
function P({ children }: { children: string }) {
  return <Text style={s.p}>{children}</Text>;
}
function KV({ rows }: { rows: [string, string][] }) {
  return (
    <View style={{ marginBottom: 6 }}>
      {rows.map(([k, v]) => (
        <View key={k} style={s.kvRow} wrap={false}>
          <Text style={s.kvKey}>{k}</Text>
          <Text style={s.kvVal}>{v}</Text>
        </View>
      ))}
    </View>
  );
}
/** cols: [label, isNumeric]; widths are equal unless `first` is set (wider first column). */
function Table({ cols, rows, first = 1 }: { cols: [string, boolean][]; rows: string[][]; first?: number }) {
  const cell = (i: number, numeric: boolean) => [s.td, ...(numeric ? [s.num] : []), ...(i === 0 ? [{ flexGrow: first }] : [])];
  return (
    <View style={s.table}>
      <View style={[s.tr, s.th]} wrap={false}>
        {cols.map(([c, n], i) => (
          <Text key={c} style={cell(i, n)}>{c}</Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          {r.map((v, i) => (
            <Text key={i} style={cell(i, cols[i][1])}>{v}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}
function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {items.map((x, i) => (
        <View key={i} style={s.bullet}>
          <Text style={{ width: 10 }}>•</Text>
          <Text style={{ flex: 1 }}>{x}</Text>
        </View>
      ))}
    </View>
  );
}

export function DprDocument({ d }: { d: DprInput }) {
  const { engine: e, context: c, narrative: n } = d;
  const approved = d.status === 'approved';
  const name = c.entrepreneur.name || 'Entrepreneur';
  const place = [c.location.village, c.location.district, c.location.state].filter(Boolean).join(', ') || '—';
  const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const years = Math.ceil(e.loan.tenureMonths / 12);
  const repay = Array.from({ length: years }, (_, i) => ({ year: i + 1, ...yearlyDebtService(e.amortization, i + 1) }));
  const capacity = c.products.filter((p) => p.maxCapacityPerMonth);

  return (
    <Document title={`Business Plan – ${name}`} author="DSK Business Plan Assistant" subject="Detailed Project Report" creator="Access Livelihoods · DSK">
      <Page size="A4" style={s.page} wrap>
        <View style={s.header} fixed>
          <Text>{`Business Plan / DPR — ${name} · ${c.business.sector}`}</Text>
          <Text>{`Version ${d.version}${approved ? ' · Approved' : ' · DRAFT'}`}</Text>
        </View>
        {!approved && <Text style={s.watermark} fixed>DRAFT</Text>}
        <View style={s.footer} fixed>
          <Text>Access Livelihoods · Digital Seva Kendra</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

        {/* Cover */}
        <View style={{ marginTop: 40, marginBottom: 24 }}>
          <Text style={s.small}>Detailed Project Report</Text>
          <Text style={s.h1}>{`${c.business.name || c.business.sector}`}</Text>
          <Text style={{ fontSize: 12, marginBottom: 14 }}>{`${name} · ${place}`}</Text>
          <KV
            rows={[
              ['Sector', c.business.sector],
              ['Stage', c.business.stage === 'new' ? 'New business' : c.business.stage === 'existing' ? 'Existing business' : '—'],
              ['Loan required', formatINR(e.loan.required)],
              ['Total project cost', formatINR(e.loan.totalProjectCost)],
              ['Plan version', `${d.version} · prepared ${date(d.createdAt)}`],
              ['Status', approved && d.approvedAt ? `Approved by DSK reviewer on ${date(d.approvedAt)}` : 'DRAFT — not yet approved by a DSK reviewer'],
            ]}
          />
          <Text style={s.note}>
            All figures in this report are calculated by the system from the information provided by the entrepreneur and the growth
            assumptions approved by the DSK operator. {d.writtenWith === 'standard-wording' ? 'Text uses standard wording.' : 'Descriptive text was drafted with AI from the verified data and checked so that it quotes only those figures.'} The repayment coverage (DSCR) is indicative: no tax or depreciation is modelled. This report prepares a loan application; it is not a loan approval.
          </Text>
        </View>

        <H n={1}>Executive Summary</H>
        <P>{n.executiveSummary}</P>

        <H n={2}>Entrepreneur Profile</H>
        <KV
          rows={[
            ['Name', name],
            ['Education', txt(c.entrepreneur.education)],
            ['Social category', txt(c.entrepreneur.socialCategory)],
            ['Household members', txt(c.entrepreneur.householdMembers)],
          ]}
        />

        <H n={3}>Location</H>
        <KV
          rows={[
            ['Village / town', txt(c.location.village)],
            ['District', txt(c.location.district)],
            ['State', txt(c.location.state)],
            ['PIN code', txt(c.location.pincode)],
          ]}
        />

        <H n={4}>Business Overview</H>
        <P>{n.businessOverview}</P>

        <H n={5}>Industry / Sector</H>
        <KV rows={[['Sector', c.business.sector], ...Object.entries(c.business.sectorAnswers).map(([q, a]) => [q, txt(a)] as [string, string])]} />

        <H n={6}>Products & Services</H>
        <Bullets items={c.products.map((p) => `${p.name}${p.unit ? ` (per ${p.unit})` : ''}`)} />

        <H n={7}>Product Portfolio</H>
        <Table
          first={2}
          cols={[['Product', false], ['Qty / month', true], ['Price', true], ['Revenue / month', true], ['Margin', true]]}
          rows={e.products.rows.map((p) => [p.name, String(p.qtyPerMonth), formatINR(p.sellingPrice), formatINR(p.revenue), pct(p.grossMarginPct)])}
        />

        <H n={8}>Production / Service Capacity</H>
        {capacity.length ? (
          <Table
            first={2}
            cols={[['Product', false], ['Planned / month', true], ['Capacity / month', true]]}
            rows={capacity.map((p) => [p.name, String(p.qtyPerMonth), String(p.maxCapacityPerMonth)])}
          />
        ) : (
          <P>Maximum capacity was not stated; planned monthly quantities are shown in section 7.</P>
        )}

        <H n={9}>Market Analysis</H>
        <P>{n.marketAnalysis}</P>

        <H n={10}>Target Customers</H>
        <KV
          rows={[
            ['Target customers', txt(c.marketing?.targetCustomers)],
            ['Sells through now', txt(c.marketing?.currentChannels)],
            ['Plans to sell through', txt(c.marketing?.proposedChannels)],
            ['Pricing approach', txt(c.marketing?.pricingStrategy)],
          ]}
        />

        <H n={11}>Marketing Plan</H>
        <P>{n.marketingPlan}</P>

        <H n={12}>Operations Plan</H>
        <P>{n.operationsPlan}</P>

        <H n={13}>Procurement Plan</H>
        <P>{n.procurementPlan}</P>

        <H n={14}>Expense Structure</H>
        <Table
          first={2}
          cols={[['Expense head', false], ['Amount', true], ['Frequency', false], ['Per month', true], ['Per year', true]]}
          rows={[
            ...e.expenses.rows.map((x) => [x.head, formatINR(x.amount), x.frequency, formatINR(x.monthly), formatINR(x.annual)]),
            ['Total operating expenses', '', '', formatINR(e.expenses.monthly), formatINR(e.expenses.annual)],
          ]}
        />

        <H n={15}>Project Cost</H>
        <Table
          first={3}
          cols={[['Item', false], ['Cost', true]]}
          rows={[
            ...c.projectCost.items.map((a) => [a.name, formatINR(a.cost)]),
            ['Other one-time setup costs', formatINR(c.projectCost.otherSetupCost)],
            ['Total project cost', formatINR(e.loan.totalProjectCost)],
          ]}
        />

        <H n={16}>Promoter Contribution</H>
        <KV rows={[['Own contribution', formatINR(e.loan.ownContribution)], ['Share of project cost', pct(e.loan.ownContributionPct)]]} />

        <H n={17}>Loan Requirement</H>
        <KV
          rows={[
            ['Loan required', formatINR(e.loan.required)],
            ['Tenure', `${e.loan.tenureMonths} months (including ${e.loan.moratoriumMonths} months moratorium)`],
            ['Interest rate', `${e.loan.annualRatePct}% per year`],
            ['Monthly EMI after moratorium', formatINR(e.loan.emi)],
          ]}
        />

        <H n={18}>Product Costing</H>
        <Table
          first={2}
          cols={[['Product', false], ['Cost / unit', true], ['Price / unit', true], ['Cost / month', true], ['Gross profit / month', true]]}
          rows={[
            ...e.products.rows.map((p) => [p.name, formatINR(p.totalCostPerUnit), formatINR(p.sellingPrice), formatINR(p.cost), formatINR(p.grossProfit)]),
            ['Total', '', '', formatINR(e.products.directCost), formatINR(e.products.grossProfit)],
          ]}
        />
        <Text style={s.small}>{`Weighted gross margin: ${pct(e.products.grossMarginPct)}. Monthly operating profit: ${formatINR(e.monthlyOperatingProfit)}.`}</Text>

        <H n={19}>Revenue Projection (3 years)</H>
        <Table
          cols={[['Year', false], ['Approved growth', true], ['Revenue', true], ['Gross profit', true]]}
          rows={e.projection.map((y) => [`Year ${y.year}`, pct(y.growthPct), formatINR(y.revenue), formatINR(y.grossProfit)])}
        />

        <H n={20}>Expense Projection (3 years)</H>
        <Table
          cols={[['Year', false], ['Direct costs', true], ['Operating expenses', true], ['Interest', true]]}
          rows={e.projection.map((y) => [`Year ${y.year}`, formatINR(y.directCost), formatINR(y.opex), formatINR(y.interest)])}
        />

        <H n={21}>Profit Projection (3 years)</H>
        <Table
          cols={[['Year', false], ['EBITDA', true], ['Net profit', true], ['Net margin', true]]}
          rows={e.projection.map((y) => [`Year ${y.year}`, formatINR(y.ebitda), formatINR(y.netProfit), pct(y.netMarginPct)])}
        />

        <H n={22}>Cash Flow</H>
        <Table
          cols={[['Year', false], ['EBITDA', true], ['Loan + existing EMIs', true], ['Cash after repayments', true]]}
          rows={e.projection.map((y) => [`Year ${y.year}`, formatINR(y.ebitda), formatINR(y.debtService), formatINR(y.cashAfterDebt)])}
        />
        <Text style={s.small}>Principal repayment is a cash outflow, not an expense; only interest reduces profit.</Text>

        <H n={23}>Break-even</H>
        <P>
          {e.breakEvenRevenueMonthly == null
            ? 'Break-even cannot be calculated because the gross margin is zero.'
            : `Monthly sales of ${formatINR(e.breakEvenRevenueMonthly)} cover the monthly operating expenses of ${formatINR(e.expenses.monthly)} at a gross margin of ${pct(e.products.grossMarginPct)}. Planned monthly sales are ${formatINR(e.products.revenue)}.`}
        </P>

        <H n={24}>Repayment Capacity</H>
        <Table
          cols={[['Year', false], ['Interest', true], ['Principal', true], ['Loan repayments', true], ['DSCR', true]]}
          rows={repay.map((r) => [
            `Year ${r.year}`,
            formatINR(r.interest),
            formatINR(r.principal),
            formatINR(r.total),
            dscrTxt(e.projection.find((y) => y.year === r.year)?.dscr ?? null),
          ])}
        />
        <Text style={s.small}>DSCR = EBITDA ÷ (loan repayments + existing EMIs) for the year. Shown for the 3 projected years; indicative only.</Text>

        <H n={25}>SWOT Analysis</H>
        {(
          [
            ['Strengths', n.swot.strengths],
            ['Weaknesses', n.swot.weaknesses],
            ['Opportunities', n.swot.opportunities],
            ['Threats', n.swot.threats],
          ] as [string, string[]][]
        ).map(([label, items]) => (
          <View key={label} wrap={false}>
            <Text style={{ fontWeight: 700, marginTop: 2 }}>{label}</Text>
            <Bullets items={items} />
          </View>
        ))}

        <H n={26}>Future Growth Plan</H>
        <KV
          rows={[
            ['Short term', txt(n.futureGrowthPlan.shortTerm)],
            ['Year 1', txt(n.futureGrowthPlan.year1)],
            ['Year 2', txt(n.futureGrowthPlan.year2)],
            ['Year 3', txt(n.futureGrowthPlan.year3)],
            ['Expansion requirements', txt(n.futureGrowthPlan.expansionRequirements)],
          ]}
        />

        <H n={27}>Risks & Mitigation</H>
        <Table first={1} cols={[['Risk', false], ['Mitigation', false]]} rows={n.risksAndMitigation.map((r) => [r.risk, r.mitigation])} />

        <H n={28}>Employment Generation</H>
        <P>{n.employmentGeneration}</P>

        <H n={29}>Implementation Timeline</H>
        <Table first={1} cols={[['Period', false], ['Activity', false]]} rows={n.implementationTimeline.map((t) => [t.period, t.activity])} />

        <H n={30}>Funding Requirement / Conclusion</H>
        <P>{n.conclusion}</P>

        {c.validationFlags.length > 0 && (
          <View wrap={false} style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: 700, color: C.warn }}>Points checked by the system</Text>
            <Bullets items={c.validationFlags} />
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function renderDpr(d: DprInput): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<DprDocument d={d} />);
}

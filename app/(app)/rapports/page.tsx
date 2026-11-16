'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatFC, todayISO } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Download, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

type Counting = {
  counting_date: string;
  sold_qty: number | null;
  amount_expected: number | null;
  paid_amount: number;
  gross_profit: number | null;
  seller_commission: number | null;
  owner_share: number | null;
};
type CreamSale = {
  sale_date: string;
  total_sales: number;
  commission: number | null;
  food_allowance: number;
  expected_amount: number | null;
  paid_amount: number;
};

function monthStart(ref: string) {
  return `${ref.slice(0, 7)}-01`;
}

function csvEscape(v: string | number) {
  const s = String(v);
  return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RapportsPage() {
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois'>('mois');
  const [refDate, setRefDate] = useState(todayISO());
  const [countings, setCountings] = useState<Counting[]>([]);
  const [creamSales, setCreamSales] = useState<CreamSale[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const d = new Date(`${refDate}T00:00:00Z`);
    if (period === 'jour') return { start: refDate, end: refDate };
    if (period === 'semaine') {
      const day = d.getUTCDay();
      const shift = day === 0 ? -6 : 1 - day;
      const s = new Date(d);
      s.setUTCDate(d.getUTCDate() + shift);
      const e = new Date(s);
      e.setUTCDate(s.getUTCDate() + 6);
      return { start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) };
    }
    return {
      start: monthStart(refDate),
      end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
    };
  }, [period, refDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cRes, sRes] = await Promise.all([
      supabase
        .from('drink_countings')
        .select('counting_date, sold_qty, amount_expected, paid_amount, gross_profit, seller_commission, owner_share')
        .gte('counting_date', range.start)
        .lte('counting_date', range.end),
      supabase
        .from('cream_sales')
        .select('sale_date, total_sales, commission, food_allowance, expected_amount, paid_amount')
        .gte('sale_date', range.start)
        .lte('sale_date', range.end),
    ]);
    setCountings(cRes.data ?? []);
    setCreamSales(sRes.data ?? []);
    setLoading(false);
  }, [range.start, range.end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const byDay = useMemo(() => {
    const map = new Map<string, {
      jour: string;
      boissonsBrut: number;
      boissonsCommission: number;
      boissonsReste: number;
      cremesVentes: number;
      cremesCommission: number;
      cremesNourriture: number;
      cremesSolde: number;
      totalCommission: number;
    }>();
    const ensure = (date: string) => {
      let e = map.get(date);
      if (!e) {
        e = {
          jour: date,
          boissonsBrut: 0,
          boissonsCommission: 0,
          boissonsReste: 0,
          cremesVentes: 0,
          cremesCommission: 0,
          cremesNourriture: 0,
          cremesSolde: 0,
          totalCommission: 0,
        };
        map.set(date, e);
      }
      return e;
    };
    countings.forEach((c) => {
      const e = ensure(c.counting_date);
      e.boissonsBrut += Number(c.gross_profit ?? 0);
      e.boissonsCommission += Number(c.seller_commission ?? 0);
      e.boissonsReste += Number(c.owner_share ?? 0);
    });
    creamSales.forEach((s) => {
      const e = ensure(s.sale_date);
      e.cremesVentes += Number(s.total_sales);
      e.cremesCommission += Number(s.commission ?? 0);
      e.cremesNourriture += Number(s.food_allowance);
      e.cremesSolde += Number(s.expected_amount ?? 0);
    });
    const list = Array.from(map.values()).sort((a, b) => (a.jour < b.jour ? -1 : 1));
    list.forEach((e) => (e.totalCommission = e.boissonsCommission + e.cremesCommission));
    return list;
  }, [countings, creamSales]);

  const totals = useMemo(
    () =>
      byDay.reduce(
        (acc, e) => ({
          boissonsBrut: acc.boissonsBrut + e.boissonsBrut,
          boissonsCommission: acc.boissonsCommission + e.boissonsCommission,
          boissonsReste: acc.boissonsReste + e.boissonsReste,
          cremesVentes: acc.cremesVentes + e.cremesVentes,
          cremesCommission: acc.cremesCommission + e.cremesCommission,
          cremesNourriture: acc.cremesNourriture + e.cremesNourriture,
          cremesSolde: acc.cremesSolde + e.cremesSolde,
          totalCommission: acc.totalCommission + e.totalCommission,
        }),
        {
          boissonsBrut: 0,
          boissonsCommission: 0,
          boissonsReste: 0,
          cremesVentes: 0,
          cremesCommission: 0,
          cremesNourriture: 0,
          cremesSolde: 0,
          totalCommission: 0,
        }
      ),
    [byDay]
  );

  function exportCSV() {
    const rows: (string | number)[][] = [
      ['Date', 'Bénéfice brut boissons', 'Commission boissons', 'Part restante boissons', 'Ventes crèmes', 'Commission crèmes', 'Nourriture', 'Solde crèmes', 'Commission totale'],
      ...byDay.map((e) => [
        e.jour,
        e.boissonsBrut,
        e.boissonsCommission,
        e.boissonsReste,
        e.cremesVentes,
        e.cremesCommission,
        e.cremesNourriture,
        e.cremesSolde,
        e.totalCommission,
      ]),
      ['TOTAL', totals.boissonsBrut, totals.boissonsCommission, totals.boissonsReste, totals.cremesVentes, totals.cremesCommission, totals.cremesNourriture, totals.cremesSolde, totals.totalCommission],
    ];
    downloadCSV(`jdk-business-rapport-${range.start}-${range.end}.csv`, rows);
  }

  function exportPDF() {
    // Impression PDF via le navigateur (zone de rapport dédiée)
    window.print();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Rapports</h1>
          <p className="text-sm text-slate-400">
            Rapport des commissions — du {range.start.split('-').reverse().join('/')} au {range.end.split('-').reverse().join('/')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="jour">Jour</TabsTrigger>
              <TabsTrigger value="semaine">Semaine</TabsTrigger>
              <TabsTrigger value="mois">Mois</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            type="date"
            value={refDate}
            onChange={(e) => setRefDate(e.target.value)}
            className="w-40 bg-slate-900 border-slate-700 text-white"
          />
          <Button onClick={exportCSV} variant="outline" className="border-slate-700">
            <Download className="h-4 w-4 mr-1" />
            Excel (CSV)
          </Button>
          <Button onClick={exportPDF} variant="outline" className="border-slate-700">
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        <RptStat label="Bénéfice brut boissons" value={formatFC(totals.boissonsBrut)} />
        <RptStat label="Commission boissons (10 % du brut)" value={formatFC(totals.boissonsCommission)} />
        <RptStat label="Commission crèmes (20 % des ventes)" value={formatFC(totals.cremesCommission)} />
        <RptStat label="Commission totale" value={formatFC(totals.totalCommission)} highlight />
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Évolution des commissions
          </CardTitle>
          <CardDescription>Par jour sur la période sélectionnée.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="jour" stroke="#64748b" fontSize={12} tickFormatter={(v: string) => v.slice(8) + '/' + v.slice(5, 7)} />
              <YAxis stroke="#64748b" fontSize={12} />
              <ChartTooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
                formatter={(value) => formatFC(Number(value))}
              />
              <Legend />
              <Line type="monotone" dataKey="boissonsCommission" name="Commission boissons" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="cremesCommission" name="Commission crèmes" stroke="#ec4899" strokeWidth={2} />
              <Line type="monotone" dataKey="totalCommission" name="Total" stroke="#38bdf8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle className="text-white">Détail journalier</CardTitle>
          <CardDescription>Tableau utilisé pour l'export Excel et l'impression PDF.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Bénéfice brut boissons</TableHead>
                <TableHead className="text-right">Commission boissons</TableHead>
                <TableHead className="text-right">Part restante boissons</TableHead>
                <TableHead className="text-right">Ventes crèmes</TableHead>
                <TableHead className="text-right">Commission crèmes</TableHead>
                <TableHead className="text-right">Nourriture</TableHead>
                <TableHead className="text-right">Solde crèmes</TableHead>
                <TableHead className="text-right">Commission totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byDay.map((e) => (
                <TableRow key={e.jour}>
                  <TableCell>{e.jour.split('-').reverse().join('/')}</TableCell>
                  <TableCell className="text-right">{formatFC(e.boissonsBrut)}</TableCell>
                  <TableCell className="text-right">{formatFC(e.boissonsCommission)}</TableCell>
                  <TableCell className="text-right">{formatFC(e.boissonsReste)}</TableCell>
                  <TableCell className="text-right">{formatFC(e.cremesVentes)}</TableCell>
                  <TableCell className="text-right">{formatFC(e.cremesCommission)}</TableCell>
                  <TableCell className="text-right">{formatFC(e.cremesNourriture)}</TableCell>
                  <TableCell className="text-right">{formatFC(e.cremesSolde)}</TableCell>
                  <TableCell className="text-right font-medium">{formatFC(e.totalCommission)}</TableCell>
                </TableRow>
              ))}
              {byDay.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500">
                    Aucune donnée sur la période.
                  </TableCell>
                </TableRow>
              )}
              {byDay.length > 0 && (
                <TableRow className="border-t-2 border-slate-700 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatFC(totals.boissonsBrut)}</TableCell>
                  <TableCell className="text-right">{formatFC(totals.boissonsCommission)}</TableCell>
                  <TableCell className="text-right">{formatFC(totals.boissonsReste)}</TableCell>
                  <TableCell className="text-right">{formatFC(totals.cremesVentes)}</TableCell>
                  <TableCell className="text-right">{formatFC(totals.cremesCommission)}</TableCell>
                  <TableCell className="text-right">{formatFC(totals.cremesNourriture)}</TableCell>
                  <TableCell className="text-right">{formatFC(totals.cremesSolde)}</TableCell>
                  <TableCell className="text-right">{formatFC(totals.totalCommission)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RptStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-emerald-800 bg-emerald-950/30' : 'bg-slate-900 border-slate-800'}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

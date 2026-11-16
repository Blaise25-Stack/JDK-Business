'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatFC, todayISO } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Loader2, Package, Sparkles, Wallet } from 'lucide-react';

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

function rangeFor(period: 'jour' | 'semaine' | 'mois', refDate: string): { start: string; end: string } {
  const d = new Date(`${refDate}T00:00:00Z`);
  if (period === 'jour') return { start: refDate, end: refDate };
  if (period === 'semaine') {
    const day = d.getUTCDay(); // 0 = dimanche
    const shiftToMonday = (day === 0 ? -6 : 1 - day);
    const start = new Date(d);
    start.setUTCDate(d.getUTCDate() + shiftToMonday);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<'jour' | 'semaine' | 'mois'>('jour');
  const [refDate, setRefDate] = useState(todayISO());
  const [countings, setCountings] = useState<Counting[]>([]);
  const [creamSales, setCreamSales] = useState<CreamSale[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => rangeFor(period, refDate), [period, refDate]);

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

  const drinkStats = useMemo(() => {
    const expected = countings.reduce((s, c) => s + Number(c.amount_expected ?? 0), 0);
    const paid = countings.reduce((s, c) => s + Number(c.paid_amount), 0);
    return {
      ventes: expected,
      attendu: expected,
      verse: paid,
      reste: expected - paid,
      commission: countings.reduce((s, c) => s + Number(c.seller_commission ?? 0), 0),
      brut: countings.reduce((s, c) => s + Number(c.gross_profit ?? 0), 0),
      restant: countings.reduce((s, c) => s + Number(c.owner_share ?? 0), 0),
      qty: countings.reduce((s, c) => s + (c.sold_qty ?? 0), 0),
    };
  }, [countings]);

  const creamStats = useMemo(() => {
    const total = creamSales.reduce((s, c) => s + Number(c.total_sales), 0);
    const paid = creamSales.reduce((s, c) => s + Number(c.paid_amount), 0);
    return {
      ventes: total,
      commission: creamSales.reduce((s, c) => s + Number(c.commission ?? 0), 0),
      nourriture: creamSales.reduce((s, c) => s + Number(c.food_allowance), 0),
      solde: creamSales.reduce((s, c) => s + Number(c.expected_amount ?? 0), 0),
      verse: paid,
    };
  }, [creamSales]);

  const global = useMemo(() => {
    // Ventes totales (boissons au prix de vente + crèmes)
    const ventes = drinkStats.ventes + creamStats.ventes;
    // Commission totale des deux activités
    const commissions = drinkStats.commission + creamStats.commission;
    // Nourriture
    const nourriture = creamStats.nourriture;
    // Argent attendu en caisse : boissons = part restante ; crèmes = solde après commission/nourriture
    const attenduCaisse = drinkStats.restant + creamStats.solde;
    const verseCaisse = drinkStats.verse + creamStats.verse;
    return { ventes, commissions, nourriture, attenduCaisse, verseCaisse, reste: attenduCaisse - verseCaisse };
  }, [drinkStats, creamStats]);

  const chartData = useMemo(() => {
    // Regroupe par jour dans la période sélectionnée
    const map = new Map<string, { jour: string; Boissons: number; Crèmes: number }>();
    const startD = new Date(`${range.start}T00:00:00Z`);
    const endD = new Date(`${range.end}T00:00:00Z`);
    for (let d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      map.set(key, { jour: key.slice(8) + '/' + key.slice(5, 7), Boissons: 0, Crèmes: 0 });
    }
    countings.forEach((c) => {
      const entry = map.get(c.counting_date);
      if (entry) entry.Boissons += Number(c.amount_expected ?? 0);
    });
    creamSales.forEach((s) => {
      const entry = map.get(s.sale_date);
      if (entry) entry.Crèmes += Number(s.total_sales);
    });
    return Array.from(map.values());
  }, [countings, creamSales, range.start, range.end]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-sm text-slate-400">
            Période du {range.start.split('-').reverse().join('/')} au {range.end.split('-').reverse().join('/')}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* ===== BOISSONS ===== */}
      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5 text-emerald-400" />
            Boissons
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total des ventes" value={formatFC(drinkStats.ventes)} />
          <Stat label="Montant attendu" value={formatFC(drinkStats.attendu)} />
          <Stat label="Montant versé" value={formatFC(drinkStats.verse)} />
          <Stat label="Reste à verser" value={formatFC(drinkStats.reste)} highlight={drinkStats.reste > 0 ? 'warning' : 'success'} />
          <Stat label="Quantités vendues" value={`${drinkStats.qty}`} />
        </CardContent>
      </Card>

      {/* ===== CRÈMES ===== */}
      <Card className="border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-pink-400" />
            Crèmes
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total des ventes" value={formatFC(creamStats.ventes)} />
          <Stat label="Commission 20 %" value={formatFC(creamStats.commission)} />
          <Stat label="Nourriture remise" value={formatFC(creamStats.nourriture)} />
          <Stat label="Solde après commission et nourriture" value={formatFC(creamStats.solde)} />
          <Stat label="Montant versé" value={formatFC(creamStats.verse)} highlight={creamStats.verse < creamStats.solde ? 'warning' : 'success'} />
        </CardContent>
      </Card>

      {/* ===== GLOBAL ===== */}
      <Card className="border-emerald-900/60 bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5 text-emerald-400" />
            Résumé global
          </CardTitle>
          <CardDescription>Synthèse des deux activités sur la période.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Chiffre d'affaires total" value={formatFC(global.ventes)} />
          <Stat label="Commission totale (boissons + crèmes)" value={formatFC(global.commissions)} />
          <Stat label="Attendu en caisse (après commissions et nourriture)" value={formatFC(global.attenduCaisse)} />
          <Stat label="Reste à encaisser" value={formatFC(global.reste)} highlight={global.reste > 0 ? 'warning' : 'success'} />
        </CardContent>
      </Card>

      {/* ===== GRAPHIQUE ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">Ventes par jour</CardTitle>
          <CardDescription>Boissons (montant attendu) et crèmes (chiffre d'affaires).</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="jour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <ChartTooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
                formatter={(value) => formatFC(Number(value))}
              />
              <Legend />
              <Bar dataKey="Boissons" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Crèmes" fill="#ec4899" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: 'warning' | 'success' }) {
  const cls =
    highlight === 'warning'
      ? 'text-amber-400'
      : highlight === 'success'
      ? 'text-emerald-400'
      : 'text-white';
  return (
    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${cls}`}>{value}</p>
    </div>
  );
}

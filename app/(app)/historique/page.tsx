'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatFC, formatDateFR } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Loader2, History as HistoryIcon } from 'lucide-react';

type Counting = {
  id: string;
  counting_date: string;
  sold_qty: number | null;
  available_qty: number;
  remaining_qty: number;
  sale_price: number;
  amount_expected: number | null;
  paid_amount: number;
  seller_commission: number | null;
  drink: { name: string } | null;
};
type Purchase = {
  id: string;
  purchase_date: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  drink: { name: string } | null;
};
type CreamSale = {
  id: string;
  sale_date: string;
  seller_name: string;
  total_sales: number;
  commission: number | null;
  food_allowance: number;
  expected_amount: number | null;
  paid_amount: number;
  difference: number | null;
  notes: string | null;
};

export default function HistoriquePage() {
  const [countings, setCountings] = useState<Counting[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [creamSales, setCreamSales] = useState<CreamSale[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    let cQuery = supabase
      .from('drink_countings')
      .select('*, drink:drinks(name)')
      .order('counting_date', { ascending: false })
      .limit(500);
    let pQuery = supabase
      .from('drink_purchases')
      .select('*, drink:drinks(name)')
      .order('purchase_date', { ascending: false })
      .limit(500);
    let sQuery = supabase.from('cream_sales').select('*').order('sale_date', { ascending: false }).limit(500);
    if (start) {
      cQuery = cQuery.gte('counting_date', start);
      pQuery = pQuery.gte('purchase_date', start);
      sQuery = sQuery.gte('sale_date', start);
    }
    if (end) {
      cQuery = cQuery.lte('counting_date', end);
      pQuery = pQuery.lte('purchase_date', end);
      sQuery = sQuery.lte('sale_date', end);
    }
    const [cRes, pRes, sRes] = await Promise.all([cQuery, pQuery, sQuery]);
    setCountings(cRes.data ?? []);
    setPurchases(pRes.data ?? []);
    setCreamSales(sRes.data ?? []);
    setLoading(false);
  }, [start, end]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const grouped = useMemo(() => {
    // Regroupe les journées (comptages + crèmes) pour comparer jour par jour
    const map = new Map<
      string,
      { date: string; boissonsAttendu: number; boissonsVersee: number; cremesVentes: number; cremesVersee: number; cremesAttendu: number }
    >();
    countings.forEach((c) => {
      const e = map.get(c.counting_date) ?? {
        date: c.counting_date,
        boissonsAttendu: 0,
        boissonsVersee: 0,
        cremesVentes: 0,
        cremesVersee: 0,
        cremesAttendu: 0,
      };
      e.boissonsAttendu += Number(c.amount_expected ?? 0);
      e.boissonsVersee += Number(c.paid_amount);
      map.set(c.counting_date, e);
    });
    creamSales.forEach((s) => {
      const e = map.get(s.sale_date) ?? {
        date: s.sale_date,
        boissonsAttendu: 0,
        boissonsVersee: 0,
        cremesVentes: 0,
        cremesVersee: 0,
        cremesAttendu: 0,
      };
      e.cremesVentes += Number(s.total_sales);
      e.cremesVersee += Number(s.paid_amount);
      e.cremesAttendu += Number(s.expected_amount ?? 0);
      map.set(s.sale_date, e);
    });
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [countings, creamSales]);

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
          <h1 className="text-2xl font-bold text-white">Historique</h1>
          <p className="text-sm text-slate-400">Toutes les opérations sont conservées. Filtrez par période pour comparer les journées.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-40 bg-slate-900 border-slate-700 text-white" />
          <span className="text-slate-500 text-sm">au</span>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-40 bg-slate-900 border-slate-700 text-white" />
        </div>
      </div>

      <Tabs defaultValue="comparaison">
        <TabsList>
          <TabsTrigger value="comparaison">Comparaison des journées</TabsTrigger>
          <TabsTrigger value="comptages">Comptages boissons</TabsTrigger>
          <TabsTrigger value="achats">Achats</TabsTrigger>
          <TabsTrigger value="cremes">Crèmes</TabsTrigger>
        </TabsList>

        <TabsContent value="comparaison">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <HistoryIcon className="h-5 w-5 text-emerald-400" />
                Journée par journée
              </CardTitle>
              <CardDescription>Montants attendus et versés pour chaque activité.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Boissons attendu</TableHead>
                    <TableHead className="text-right">Boissons versé</TableHead>
                    <TableHead className="text-right">Crèmes ventes</TableHead>
                    <TableHead className="text-right">Crèmes attendu</TableHead>
                    <TableHead className="text-right">Crèmes versé</TableHead>
                    <TableHead className="text-right">Écart total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grouped.map((g) => {
                    const ecart = g.boissonsVersee - g.boissonsAttendu + g.cremesVersee - g.cremesAttendu;
                    return (
                      <TableRow key={g.date}>
                        <TableCell>{formatDateFR(g.date)}</TableCell>
                        <TableCell className="text-right">{formatFC(g.boissonsAttendu)}</TableCell>
                        <TableCell className="text-right">{formatFC(g.boissonsVersee)}</TableCell>
                        <TableCell className="text-right">{formatFC(g.cremesVentes)}</TableCell>
                        <TableCell className="text-right">{formatFC(g.cremesAttendu)}</TableCell>
                        <TableCell className="text-right">{formatFC(g.cremesVersee)}</TableCell>
                        <TableCell className={`text-right ${ecart < 0 ? 'text-red-400' : ecart > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {formatFC(ecart)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {grouped.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500">
                        Aucune donnée sur cette période.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comptages">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Boisson</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Restante</TableHead>
                    <TableHead className="text-right">Vendue</TableHead>
                    <TableHead className="text-right">Attendu</TableHead>
                    <TableHead className="text-right">Versé</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countings.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{formatDateFR(c.counting_date)}</TableCell>
                      <TableCell>{c.drink?.name ?? '—'}</TableCell>
                      <TableCell className="text-right">{c.available_qty}</TableCell>
                      <TableCell className="text-right">{c.remaining_qty}</TableCell>
                      <TableCell className="text-right">{c.sold_qty ?? 0}</TableCell>
                      <TableCell className="text-right">{formatFC(c.amount_expected)}</TableCell>
                      <TableCell className="text-right">{formatFC(c.paid_amount)}</TableCell>
                      <TableCell className="text-right">{formatFC(c.seller_commission)}</TableCell>
                    </TableRow>
                  ))}
                  {countings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-500">
                        Aucun comptage.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achats">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Boisson</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead className="text-right">Prix unitaire</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDateFR(p.purchase_date)}</TableCell>
                      <TableCell>{p.drink?.name ?? '—'}</TableCell>
                      <TableCell className="text-right">{p.quantity}</TableCell>
                      <TableCell className="text-right">{formatFC(p.unit_cost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatFC(p.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                  {purchases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        Aucun achat.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cremes">
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Nourriture</TableHead>
                    <TableHead className="text-right">Attendu</TableHead>
                    <TableHead className="text-right">Versé</TableHead>
                    <TableHead>Observations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creamSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{formatDateFR(s.sale_date)}</TableCell>
                      <TableCell>{s.seller_name}</TableCell>
                      <TableCell className="text-right">{formatFC(s.total_sales)}</TableCell>
                      <TableCell className="text-right">{formatFC(s.commission)}</TableCell>
                      <TableCell className="text-right">{formatFC(s.food_allowance)}</TableCell>
                      <TableCell className="text-right">{formatFC(s.expected_amount)}</TableCell>
                      <TableCell className="text-right">{formatFC(s.paid_amount)}</TableCell>
                      <TableCell className="text-slate-400">{s.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {creamSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-500">
                        Aucune vente de crèmes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

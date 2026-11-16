'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatFC, todayISO, formatDateFR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Loader2, TriangleAlert, Sparkles, Pencil } from 'lucide-react';

type CreamSale = {
  id: string;
  sale_date: string;
  seller_name: string;
  total_sales: number;
  food_allowance: number;
  commission: number | null;
  balance_after: number | null;
  expected_amount: number | null;
  paid_amount: number;
  difference: number | null;
  notes: string | null;
};

export default function CremesPage() {
  const [sales, setSales] = useState<CreamSale[]>([]);
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('cream_sales')
      .select('*')
      .gte('sale_date', date)
      .lte('sale_date', date)
      .order('created_at', { ascending: true });
    if (err) {
      setError('Erreur lors du chargement des ventes de crèmes.');
    } else {
      setSales(data ?? []);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    if (date) loadData();
  }, [date, loadData]);

  async function saveSale(values: {
    id?: string;
    sale_date: string;
    seller_name: string;
    total_sales: number;
    food_allowance: number;
    paid_amount: number;
    notes: string;
  }) {
    const { error: err } = await supabase.from('cream_sales').upsert(values, {
      onConflict: values.id ? 'id' : 'sale_date,seller_name',
    });
    if (err) {
      setError('Erreur lors de l’enregistrement. Vérifiez qu’il n’existe pas déjà une entrée pour ce vendeur ce jour-là.');
      return false;
    }
    setError(null);
    loadData();
    return true;
  }

  const totalSales = sales.reduce((s, r) => s + Number(r.total_sales), 0);
  const totalCommission = sales.reduce((s, r) => s + Number(r.commission ?? 0), 0);
  const totalFood = sales.reduce((s, r) => s + Number(r.food_allowance), 0);
  const totalExpected = sales.reduce((s, r) => s + Number(r.expected_amount ?? 0), 0);
  const totalPaid = sales.reduce((s, r) => s + Number(r.paid_amount), 0);

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
          <h1 className="text-2xl font-bold text-white">Gestion des crèmes</h1>
          <p className="text-sm text-slate-400">Commission de 20 % du chiffre d'affaires · Nourriture 2 000 FC par défaut.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full sm:w-44 bg-slate-900 border-slate-700 text-white"
          />
          <SaleFormDialog date={date} onSave={saveSale} />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Total des ventes" value={formatFC(totalSales)} />
        <SummaryTile label="Commission 20 %" value={formatFC(totalCommission)} />
        <SummaryTile label="Nourriture remise" value={formatFC(totalFood)} />
        <SummaryTile label="Solde après commission et nourriture" value={formatFC(totalExpected)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryTile label="Montant attendu (à remettre)" value={formatFC(totalExpected)} highlight="info" />
        <SummaryTile
          label="Montant effectivement versé"
          value={formatFC(totalPaid)}
          highlight={totalPaid < totalExpected ? 'warning' : 'success'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            Journal du {formatDateFR(date)}
          </CardTitle>
          <CardDescription>
            Exemple : ventes 20 000 FC → commission 4 000 FC, nourriture 2 000 FC, solde attendu 14 000 FC.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendeur</TableHead>
                <TableHead className="text-right">Ventes</TableHead>
                <TableHead className="text-right">Commission (20 %)</TableHead>
                <TableHead className="text-right">Nourriture</TableHead>
                <TableHead className="text-right">Solde attendu</TableHead>
                <TableHead className="text-right">Versé</TableHead>
                <TableHead className="text-right">Écart</TableHead>
                <TableHead>Observations</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.seller_name}</TableCell>
                  <TableCell className="text-right">{formatFC(s.total_sales)}</TableCell>
                  <TableCell className="text-right">{formatFC(s.commission)}</TableCell>
                  <TableCell className="text-right">{formatFC(s.food_allowance)}</TableCell>
                  <TableCell className="text-right">{formatFC(s.expected_amount)}</TableCell>
                  <TableCell className="text-right">{formatFC(s.paid_amount)}</TableCell>
                  <TableCell className={`text-right ${Number(s.difference) < 0 ? 'text-red-400' : Number(s.difference) > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {formatFC(s.difference)}
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-slate-400">{s.notes || '—'}</TableCell>
                  <TableCell className="text-right">
                    <SaleFormDialog date={date} sale={s} onSave={saveSale} />
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500">
                    Aucune vente enregistrée ce jour. Cliquez sur « Nouvelle journée ».
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: 'warning' | 'success' | 'info' }) {
  const cls =
    highlight === 'warning'
      ? 'border-amber-900 bg-amber-950/30'
      : highlight === 'success'
      ? 'border-emerald-900 bg-emerald-950/30'
      : highlight === 'info'
      ? 'border-sky-900 bg-sky-950/30'
      : '';
  return (
    <Card className={cls}>
      <CardContent className="pt-6">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function SaleFormDialog({
  date,
  sale,
  onSave,
}: {
  date: string;
  sale?: CreamSale;
  onSave: (values: {
    id?: string;
    sale_date: string;
    seller_name: string;
    total_sales: number;
    food_allowance: number;
    paid_amount: number;
    notes: string;
  }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [sellerName, setSellerName] = useState(sale?.seller_name ?? '');
  const [saleDate, setSaleDate] = useState(sale?.sale_date ?? date);
  const [totalSales, setTotalSales] = useState(sale ? String(sale.total_sales) : '');
  const [food, setFood] = useState(sale ? String(sale.food_allowance) : '2000');
  const [paid, setPaid] = useState(sale ? String(sale.paid_amount) : '');
  const [notes, setNotes] = useState(sale?.notes ?? '');

  useEffect(() => {
    if (open && !sale) setSaleDate(date);
  }, [open, date, sale]);

  const totalSalesNum = Number(totalSales || 0);
  const foodNum = Number(food || 0);
  const paidNum = Number(paid || 0);
  const commission = Math.round(totalSalesNum * 0.2);
  const expected = totalSalesNum - commission - foodNum;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {sale ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-emerald-600 hover:bg-emerald-500">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle journée
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{sale ? 'Modifier la journée' : 'Nouvelle journée de vente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="bg-slate-950 border-slate-700" />
            </div>
            <div className="space-y-1.5">
              <Label>Vendeur / Vendeuse</Label>
              <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Nom" className="bg-slate-950 border-slate-700" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Montant total des ventes (FC)</Label>
            <Input type="number" min="0" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} className="bg-slate-950 border-slate-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nourriture remise le matin (FC)</Label>
              <Input type="number" min="0" value={food} onChange={(e) => setFood(e.target.value)} className="bg-slate-950 border-slate-700" />
            </div>
            <div className="space-y-1.5">
              <Label>Montant versé en fin de journée (FC)</Label>
              <Input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} className="bg-slate-950 border-slate-700" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Observations (facultatif)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Remarque…" className="bg-slate-950 border-slate-700" />
          </div>

          <div className="rounded-md bg-slate-950 border border-slate-800 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Commission (20 %)</span>
              <span className="font-medium">{formatFC(commission)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nourriture</span>
              <span className="font-medium">{formatFC(foodNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Solde attendu (ventes − commission − nourriture)</span>
              <span className="font-medium text-emerald-400">{formatFC(expected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Écart (versé − attendu)</span>
              <span className={`font-medium ${paidNum - expected < 0 ? 'text-red-400' : ''}`}>{formatFC(paidNum - expected)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-500"
            disabled={!sellerName || !totalSales}
            onClick={async () => {
              const ok = await onSave({
                id: sale?.id,
                sale_date: saleDate,
                seller_name: sellerName.trim(),
                total_sales: totalSalesNum,
                food_allowance: foodNum,
                paid_amount: paidNum,
                notes,
              });
              if (ok) setOpen(false);
            }}
          >
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

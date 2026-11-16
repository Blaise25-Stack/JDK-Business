'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatFC, todayISO, formatDateFR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Trash2, Loader2, TriangleAlert, Package, ShoppingCart } from 'lucide-react';

type Drink = { id: string; name: string };
type Purchase = {
  id: string;
  drink_id: string;
  quantity: number;
  unit_cost: number;
  purchase_date: string;
  total_amount: number;
};
type Counting = {
  id: string;
  drink_id: string;
  counting_date: string;
  available_qty: number;
  remaining_qty: number;
  sold_qty: number | null;
  sale_price: number;
  amount_expected: number | null;
  paid_amount: number;
  wac_cost: number;
  gross_profit: number | null;
  seller_commission: number | null;
  owner_share: number | null;
};

export default function BoissonsPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [countings, setCountings] = useState<Counting[]>([]);
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDrinkName, setNewDrinkName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [drinksRes, purchasesRes, countingsRes] = await Promise.all([
      supabase.from('drinks').select('*').order('name'),
      supabase.from('drink_purchases').select('*').eq('purchase_date', date).order('created_at'),
      supabase.from('drink_countings').select('*').eq('counting_date', date).order('created_at'),
    ]);
    if (drinksRes.error || purchasesRes.error || countingsRes.error) {
      setError('Erreur lors du chargement des données.');
    } else {
      setDrinks(drinksRes.data ?? []);
      setPurchases(purchasesRes.data ?? []);
      setCountings(countingsRes.data ?? []);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    if (date) loadData();
  }, [date, loadData]);

  async function addDrink() {
    const name = newDrinkName.trim();
    if (!name) return;
    const { error: err } = await supabase.from('drinks').insert({ name });
    if (err) {
      setError('Impossible d’ajouter cette boisson (elle existe peut-être déjà).');
      return;
    }
    setNewDrinkName('');
    loadData();
  }

  async function addPurchase(drinkId: string, quantity: number, unitCost: number, purchaseDate: string) {
    const { error: err } = await supabase.from('drink_purchases').insert({
      drink_id: drinkId,
      quantity,
      unit_cost: unitCost,
      purchase_date: purchaseDate,
    });
    if (err) {
      setError('Erreur lors de l’enregistrement de l’achat.');
      return;
    }
    loadData();
  }

  async function saveCounting(
    drinkId: string,
    values: { available_qty: number; remaining_qty: number; sale_price: number; paid_amount: number }
  ) {
    if (values.remaining_qty > values.available_qty) {
      setError('La quantité restante ne peut pas dépasser la quantité disponible.');
      return;
    }
    const { error: err } = await supabase.from('drink_countings').upsert(
      {
        drink_id: drinkId,
        counting_date: date,
        ...values,
      },
      { onConflict: 'drink_id,counting_date' }
    );
    if (err) {
      setError('Erreur lors de l’enregistrement du comptage.');
      return;
    }
    setError(null);
    loadData();
  }

  async function deletePurchase(id: string) {
    await supabase.from('drink_purchases').delete().eq('id', id);
    loadData();
  }

  const totalPurchasedQty = purchases.reduce((s, p) => s + p.quantity, 0);
  const totalPurchaseCost = purchases.reduce((s, p) => s + Number(p.total_amount), 0);
  const totalSoldQty = countings.reduce((s, c) => s + (c.sold_qty ?? 0), 0);
  const totalExpected = countings.reduce((s, c) => s + Number(c.amount_expected ?? 0), 0);
  const totalPaid = countings.reduce((s, c) => s + Number(c.paid_amount), 0);
  const totalRemainingToPay = totalExpected - totalPaid;
  const totalGrossProfit = countings.reduce((s, c) => s + Number(c.gross_profit ?? 0), 0);
  const totalCommission = countings.reduce((s, c) => s + Number(c.seller_commission ?? 0), 0);
  const totalOwnerShare = countings.reduce((s, c) => s + Number(c.owner_share ?? 0), 0);

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
          <h1 className="text-2xl font-bold text-white">Gestion des boissons</h1>
          <p className="text-sm text-slate-400">Achats, comptage physique et bilan journalier.</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-44 bg-slate-900 border-slate-700 text-white"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Attention</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="comptage">
        <TabsList>
          <TabsTrigger value="comptage">Comptage du jour</TabsTrigger>
          <TabsTrigger value="achats">Achats</TabsTrigger>
          <TabsTrigger value="bilan">Bilan</TabsTrigger>
        </TabsList>

        {/* ===== COMPTAGE ===== */}
        <TabsContent value="comptage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="h-5 w-5 text-emerald-400" />
                Comptage physique du {formatDateFR(date)}
              </CardTitle>
              <CardDescription>
                Saisissez la quantité disponible (stock initial + achats du jour) et la quantité réellement restante. La quantité vendue est calculée automatiquement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {drinks.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aucune boisson enregistrée. Ajoutez d'abord une boisson dans l'onglet « Achats ».
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Boisson</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Restante</TableHead>
                        <TableHead className="text-right">Vendue</TableHead>
                        <TableHead className="text-right">Prix de vente</TableHead>
                        <TableHead className="text-right">Montant attendu</TableHead>
                        <TableHead className="text-right">Versé</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drinks.map((d) => {
                        const c = countings.find((x) => x.drink_id === d.id);
                        return (
                          <CountingRow
                            key={d.id}
                            drink={d}
                            counting={c}
                            onSave={(values) => saveCounting(d.id, values)}
                          />
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ACHATS ===== */}
        <TabsContent value="achats" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white">Boissons</CardTitle>
              <CardDescription>Catalogue des boissons vendues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de la boisson"
                  value={newDrinkName}
                  onChange={(e) => setNewDrinkName(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && addDrink()}
                />
                <Button onClick={addDrink} className="bg-emerald-600 hover:bg-emerald-500">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-1.5">
                {drinks.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-md bg-slate-900 px-3 py-2 text-sm text-slate-200">
                    <span>{d.name}</span>
                    <button
                      className="text-slate-500 hover:text-red-400"
                      title="Supprimer"
                      onClick={async () => {
                        await supabase.from('drinks').delete().eq('id', d.id);
                        loadData();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
                {drinks.length === 0 && <li className="text-sm text-slate-500">Aucune boisson.</li>}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShoppingCart className="h-5 w-5 text-emerald-400" />
                Achats du {formatDateFR(date)}
              </CardTitle>
              <CardDescription>Montant total = quantité × prix d'achat unitaire.</CardDescription>
            </CardHeader>
            <CardContent>
              <PurchaseForm drinks={drinks} date={date} onSubmit={addPurchase} />
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Boisson</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => {
                      const drink = drinks.find((d) => d.id === p.drink_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>{drink?.name ?? '—'}</TableCell>
                          <TableCell className="text-right">{p.quantity}</TableCell>
                          <TableCell className="text-right">{formatFC(p.unit_cost)}</TableCell>
                          <TableCell className="text-right font-medium">{formatFC(p.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            <button
                              className="text-slate-500 hover:text-red-400"
                              onClick={() => deletePurchase(p.id)}
                              title="Supprimer l'achat"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {purchases.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500">
                          Aucun achat enregistré ce jour.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== BILAN ===== */}
        <TabsContent value="bilan" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Quantités achetées" value={`${totalPurchasedQty}`} />
            <SummaryCard label="Boissons vendues" value={`${totalSoldQty}`} />
            <SummaryCard label="Montant attendu" value={formatFC(totalExpected)} />
            <SummaryCard label="Montant versé" value={formatFC(totalPaid)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Reste à verser"
              value={formatFC(totalRemainingToPay)}
              highlight={totalRemainingToPay > 0 ? 'warning' : 'success'}
            />
            <SummaryCard label="Bénéfice brut" value={formatFC(totalGrossProfit)} />
            <SummaryCard label="Commission vendeur (10 %)" value={formatFC(totalCommission)} />
            <SummaryCard label="Part restante" value={formatFC(totalOwnerShare)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Détail par boisson</CardTitle>
              <CardDescription>
                Le coût unitaire moyen pondéré (CUMP) est calculé automatiquement à partir des achats. Commission = bénéfice brut × 10 %.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Boisson</TableHead>
                    <TableHead className="text-right">Vendue</TableHead>
                    <TableHead className="text-right">CUMP</TableHead>
                    <TableHead className="text-right">Coût des ventes</TableHead>
                    <TableHead className="text-right">Bénéfice brut</TableHead>
                    <TableHead className="text-right">Commission (10 %)</TableHead>
                    <TableHead className="text-right">Part restante</TableHead>
                    <TableHead className="text-right">Écart versé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countings.map((c) => {
                    const drink = drinks.find((d) => d.id === c.drink_id);
                    const costOfSales = (c.sold_qty ?? 0) * Number(c.wac_cost);
                    const ecart = Number(c.paid_amount) - Number(c.amount_expected ?? 0);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{drink?.name ?? '—'}</TableCell>
                        <TableCell className="text-right">{c.sold_qty ?? 0}</TableCell>
                        <TableCell className="text-right">{formatFC(c.wac_cost)}</TableCell>
                        <TableCell className="text-right">{formatFC(costOfSales)}</TableCell>
                        <TableCell className="text-right">{formatFC(c.gross_profit)}</TableCell>
                        <TableCell className="text-right">{formatFC(c.seller_commission)}</TableCell>
                        <TableCell className="text-right">{formatFC(c.owner_share)}</TableCell>
                        <TableCell className={`text-right ${ecart < 0 ? 'text-red-400' : ecart > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {formatFC(ecart)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {countings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-slate-500">
                        Aucun comptage ce jour.
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

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: 'warning' | 'success' }) {
  return (
    <Card
      className={
        highlight === 'warning'
          ? 'border-amber-900 bg-amber-950/30'
          : highlight === 'success'
          ? 'border-emerald-900 bg-emerald-950/30'
          : ''
      }
    >
      <CardContent className="pt-6">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function CountingRow({
  drink,
  counting,
  onSave,
}: {
  drink: Drink;
  counting: Counting | undefined;
  onSave: (values: { available_qty: number; remaining_qty: number; sale_price: number; paid_amount: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState('');
  const [remaining, setRemaining] = useState('');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');

  function openDialog() {
    setAvailable(counting ? String(counting.available_qty) : '');
    setRemaining(counting ? String(counting.remaining_qty) : '');
    setPrice(counting ? String(counting.sale_price) : '');
    setPaid(counting ? String(counting.paid_amount) : '');
    setOpen(true);
  }

  const availableNum = Number(available);
  const remainingNum = Number(remaining);
  const priceNum = Number(price);
  const paidNum = Number(paid || 0);
  const sold = available && remaining !== '' ? Math.max(availableNum - remainingNum, 0) : null;
  const invalid = remaining !== '' && remainingNum > availableNum;

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{drink.name}</TableCell>
        <TableCell className="text-right">{counting?.available_qty ?? '—'}</TableCell>
        <TableCell className="text-right">{counting?.remaining_qty ?? '—'}</TableCell>
        <TableCell className="text-right">{counting ? (counting.sold_qty ?? 0) : '—'}</TableCell>
        <TableCell className="text-right">{counting ? formatFC(counting.sale_price) : '—'}</TableCell>
        <TableCell className="text-right">{counting ? formatFC(counting.amount_expected) : '—'}</TableCell>
        <TableCell className="text-right">{counting ? formatFC(counting.paid_amount) : '—'}</TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={openDialog}>
            {counting ? 'Modifier' : 'Saisir'}
          </Button>
        </TableCell>
      </TableRow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Comptage — {drink.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Disponible (début + achats)</Label>
                <Input type="number" min="0" value={available} onChange={(e) => setAvailable(e.target.value)} className="bg-slate-950 border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label>Restante (comptage)</Label>
                <Input type="number" min="0" value={remaining} onChange={(e) => setRemaining(e.target.value)} className="bg-slate-950 border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label>Prix de vente unitaire (FC)</Label>
                <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="bg-slate-950 border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label>Montant versé (FC)</Label>
                <Input type="number" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} className="bg-slate-950 border-slate-700" />
              </div>
            </div>

            {invalid && (
              <p className="text-sm text-red-400">La quantité restante ne peut pas dépasser la quantité disponible.</p>
            )}

            <div className="rounded-md bg-slate-950 border border-slate-800 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Quantité vendue</span>
                <span className="font-medium">{sold ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Montant attendu</span>
                <span className="font-medium">{sold !== null ? formatFC(sold * priceNum) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Écart (versé − attendu)</span>
                <span className={`font-medium ${paidNum - (sold ?? 0) * priceNum < 0 ? 'text-red-400' : ''}`}>
                  {sold !== null ? formatFC(paidNum - sold * priceNum) : '—'}
                </span>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500"
              disabled={invalid || !available || remaining === '' || !price}
              onClick={() => {
                onSave({
                  available_qty: availableNum,
                  remaining_qty: remainingNum,
                  sale_price: priceNum,
                  paid_amount: paidNum,
                });
                setOpen(false);
              }}
            >
              Enregistrer le comptage
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PurchaseForm({
  drinks,
  date,
  onSubmit,
}: {
  drinks: Drink[];
  date: string;
  onSubmit: (drinkId: string, quantity: number, unitCost: number, purchaseDate: string) => void;
}) {
  const [drinkId, setDrinkId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(date);

  useEffect(() => {
    setPurchaseDate(date);
  }, [date]);

  const total = Number(quantity) * Number(unitCost);

  return (
    <div className="space-y-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="bg-emerald-600 hover:bg-emerald-500">
            <Plus className="h-4 w-4 mr-1" />
            Nouvel achat
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un achat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Boisson</Label>
              <select
                value={drinkId}
                onChange={(e) => setDrinkId(e.target.value)}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="">Choisir une boisson</option>
                {drinks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantité</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="bg-slate-950 border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label>Prix d'achat unitaire (FC)</Label>
                <Input type="number" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="bg-slate-950 border-slate-700" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date de l'achat</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="bg-slate-950 border-slate-700" />
            </div>
            <div className="flex justify-between rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm">
              <span className="text-slate-400">Montant total</span>
              <span className="font-medium">{formatFC(total)}</span>
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500"
              disabled={!drinkId || !quantity || !unitCost}
              onClick={() => {
                onSubmit(drinkId, Number(quantity), Number(unitCost), purchaseDate);
                setQuantity('');
                setUnitCost('');
              }}
            >
              Enregistrer l'achat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

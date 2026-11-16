'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp, session, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace('/');
    }
  }, [loading, session, router]);

  async function handleAuth(mode: 'signin' | 'signup') {
    setError(null);
    setBusy(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result.error) {
      setError(
        mode === 'signup'
          ? "Impossible de créer le compte. Vérifiez l'adresse (minimum 6 caractères pour le mot de passe)."
          : 'Identifiant ou mot de passe incorrect.'
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-4">
            <Package className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">JDK-Business</h1>
          <p className="text-slate-400 mt-1 text-sm">Gestion des boissons et des crèmes</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Accès administrateur
            </CardTitle>
            <CardDescription>Connectez-vous pour consulter et enregistrer les opérations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Première installation</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-4">
                <CredentialsFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500" disabled={busy} onClick={() => handleAuth('signin')}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter'}
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4">
                <p className="text-xs text-slate-400">
                  Créez le compte administrateur la première fois. Choisissez un mot de passe d'au moins 6 caractères.
                </p>
                <CredentialsFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500" disabled={busy} onClick={() => handleAuth('signup')}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer le compte administrateur'}
                </Button>
              </TabsContent>
            </Tabs>
            {error && (
              <p className="mt-4 text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md px-3 py-2">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CredentialsFields({
  email,
  setEmail,
  password,
  setPassword,
}: {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">Adresse e-mail</Label>
        <Input id="email" type="email" placeholder="admin@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-950 border-slate-700 text-white" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300">Mot de passe</Label>
        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-950 border-slate-700 text-white" />
      </div>
    </>
  );
}

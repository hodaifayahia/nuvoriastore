import { useState } from 'react';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Database, Image as ImageIcon, AlertTriangle } from 'lucide-react';

export default function AdminBackupPage() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const invoke = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('data-backup', { body: payload });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const handleExport = async () => {
    setBusy('export');
    setProgress(2);
    setStatus('Extraction des données...');
    try {
      const data = await invoke({ action: 'export' });
      const zip = new JSZip();
      zip.file('data.json', JSON.stringify({ exported_at: data.exported_at, tables: data.tables }, null, 2));

      const files: { bucket: string; path: string; url: string }[] = data.files || [];
      const filesFolder = zip.folder('files')!;
      let done = 0;
      for (const f of files) {
        try {
          const res = await fetch(f.url);
          if (res.ok) filesFolder.file(`${f.bucket}/${f.path}`, await res.blob());
        } catch { /* skip unreachable file */ }
        done++;
        setProgress(5 + Math.round((done / Math.max(files.length, 1)) * 85));
        setStatus(`Fichiers: ${done}/${files.length}`);
      }

      setStatus('Compression...');
      const blob = await zip.generateAsync({ type: 'blob' }, (m) => setProgress(90 + Math.round(m.percent / 10)));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Sauvegarde téléchargée ✅' });
    } catch (e) {
      toast({ title: 'Échec de la sauvegarde', description: String((e as Error).message), variant: 'destructive' });
    } finally {
      setBusy(null);
      setProgress(0);
      setStatus('');
    }
  };

  const handleImport = async (file: File) => {
    if (!confirm('Restaurer cette sauvegarde ? Les données existantes portant le même identifiant seront écrasées.')) return;
    setBusy('import');
    setProgress(2);
    setStatus('Lecture du fichier...');
    try {
      const zip = await JSZip.loadAsync(file);
      const dataFile = zip.file('data.json');
      if (!dataFile) throw new Error('data.json introuvable dans le fichier ZIP');
      const parsed = JSON.parse(await dataFile.async('string'));

      setStatus('Restauration de la base de données...');
      setProgress(10);
      await invoke({ action: 'import', tables: parsed.tables });

      const entries = Object.keys(zip.files).filter((p) => p.startsWith('files/') && !zip.files[p].dir);
      let done = 0;
      for (const path of entries) {
        const rel = path.slice('files/'.length);
        const slash = rel.indexOf('/');
        const bucket = rel.slice(0, slash);
        const objectPath = rel.slice(slash + 1);
        const b64 = await zip.files[path].async('base64');
        try {
          await invoke({ action: 'upload', bucket, path: objectPath, content_base64: b64 });
        } catch { /* skip failed file */ }
        done++;
        setProgress(15 + Math.round((done / Math.max(entries.length, 1)) * 85));
        setStatus(`Fichiers restaurés: ${done}/${entries.length}`);
      }
      toast({ title: 'Restauration terminée ✅' });
    } catch (e) {
      toast({ title: 'Échec de la restauration', description: String((e as Error).message), variant: 'destructive' });
    } finally {
      setBusy(null);
      setProgress(0);
      setStatus('');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="font-cairo font-bold text-2xl">Sauvegarde &amp; Restauration</h1>
        <p className="text-sm text-muted-foreground font-cairo mt-1">
          النسخ الاحتياطي واستعادة البيانات — يشمل جميع الجداول والصور والملفات.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-cairo flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Télécharger la sauvegarde
          </CardTitle>
          <CardDescription className="font-cairo text-xs">
            Un fichier ZIP contenant <b>data.json</b> (toutes les tables) et le dossier <b>files/</b> (toutes les images et documents).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 text-xs font-cairo text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Database className="w-3.5 h-3.5" /> Produits, commandes, clients, réglages…</span>
            <span className="inline-flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> products, store, receipts, returns, documents</span>
          </div>
          <Button onClick={handleExport} disabled={busy !== null} className="gap-2">
            <Download className="w-4 h-4" />
            {busy === 'export' ? 'Sauvegarde en cours…' : 'Télécharger la sauvegarde complète'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-cairo flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Restaurer une sauvegarde
          </CardTitle>
          <CardDescription className="font-cairo text-xs">
            Importez un fichier ZIP généré ci-dessus. Les lignes existantes avec le même identifiant seront mises à jour.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs font-cairo">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <span>Action sensible : effectuez d’abord une sauvegarde avant toute restauration.</span>
          </div>
          <input
            type="file"
            accept=".zip"
            disabled={busy !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) handleImport(f);
            }}
            className="block w-full text-sm font-cairo file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
          />
        </CardContent>
      </Card>

      {busy && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Progress value={progress} />
            <p className="text-xs font-cairo text-muted-foreground">{status}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FolderTree, 
  Tags, 
  BookOpen, 
  Search, 
  BarChart3, 
  Brain, 
  Settings, 
  Workflow,
  CheckCircle,
  Layers,
  Merge,
  FileText,
  Sparkles,
  Copy,
  Filter,
  AlertCircle,
  TrendingUp,
  Lightbulb,
  Database,
  History,
  Zap
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.15),transparent)]" />
        <div className="container mx-auto px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8">
              <Image
                src="/adalbert.png"
                alt="Adalbert"
                width={150}
                height={150}
                priority
                className="rounded-full shadow-2xl ring-4 ring-violet-500/20"
              />
            </div>
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              MCP Server für Anki
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-6xl">
              Adalbert
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 md:text-xl">
              Ein intelligenter MCP-Server, der deine Anki-Prüfungsdecks mit 
              KI-generierten deutschen Erklärungen anreichert und organisiert.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white">
                <BookOpen className="mr-2 h-5 w-5" />
                Dokumentation
              </Button>
              <Button size="lg" variant="outline">
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              So funktioniert es
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Adalbert läuft als MCP-Server im Hintergrund und integriert sich nahtlos mit deinem Workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-violet-200 dark:border-violet-800/50">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
                  <BookOpen className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle>1. Decks lesen</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-zinc-600 dark:text-zinc-400">
                Liest deine .apkg Dateien oder verbindet sich direkt mit Anki Desktop
              </CardContent>
            </Card>
            <Card className="border-violet-200 dark:border-violet-800/50">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
                  <Brain className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle>2. KI-Anreicherung</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-zinc-600 dark:text-zinc-400">
                Generiert deutsche Erklärungen, Eselsbrücken und Referenzen via Gemini API
              </CardContent>
            </Card>
            <Card className="border-violet-200 dark:border-violet-800/50">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/50">
                  <CheckCircle className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle>3. Synchronisieren</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-zinc-600 dark:text-zinc-400">
                Synchronisiert die angereicherten Karten direkt zu Anki Desktop - kein Import/Export nötig!
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Card Enrichment Section */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              Karten-Anreicherung
            </Badge>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Jede Karte wird angereichert mit
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  LÖSUNG
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                Die richtige(n) Antwort(en) klar am Anfang dargestellt
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                  ERKLÄRUNG
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                Detaillierte deutsche Erklärung mit Begründungen für jede Option
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <Lightbulb className="h-5 w-5" />
                  ESELSBRÜCKE
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                Gedächtnisstützen (Mnemonics) wenn anwendbar
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-600">
                  <FileText className="h-5 w-5" />
                  REFERENZ
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                Verweise auf Lehrbücher und Leitlinien
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Organisations-Features
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Leistungsstarke Tools zur Organisation deiner Anki-Decks
            </p>
          </div>

          {/* Deck Organization */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50">
                <FolderTree className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Deck-Organisation
              </h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-4 w-4 text-violet-500" />
                    Deck-Hierarchie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Decks umbenennen und standardisieren
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Mehrere Decks zusammenführen
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Strukturierte Hierarchien erstellen
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Leere Decks automatisch finden
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Beispiel-Struktur</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-x-auto text-zinc-700 dark:text-zinc-300">
{`TUD Klinik/
  ├── Semester 9/
  │   ├── Altfragen/
  │   │   ├── Orthopädie (343 Karten)
  │   │   ├── Innere Medizin
  │   │   └── Chirurgie
  │   └── Lernkarten/
  │       └── Orthopädie Wichtig (~50 Karten)
  └── Semester 10/
      └── ...`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tag Management */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Tags className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Tag-Management
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Automatische Tags</CardTitle>
                  <CardDescription>Tags werden automatisch vergeben basierend auf:</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Deck-Namen:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">#Orthopädie</Badge>
                        <Badge variant="secondary">#Altfragen</Badge>
                        <Badge variant="secondary">#Semester9</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Fragetyp:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">#KPRIM</Badge>
                        <Badge variant="secondary">#MC</Badge>
                        <Badge variant="secondary">#SC</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Themen:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">#Hüfte</Badge>
                        <Badge variant="secondary">#Wirbelsäule</Badge>
                        <Badge variant="secondary">#Knie</Badge>
                        <Badge variant="secondary">#Fuß</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tag-Organisation</CardTitle>
                  <CardDescription>Behalte deine Tags organisiert</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <li className="flex items-center gap-2">
                      <Merge className="h-4 w-4 text-blue-500" />
                      <span>Tags standardisieren (ortho → Orthopädie)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Merge className="h-4 w-4 text-blue-500" />
                      <span>Ähnliche Tags zusammenführen</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <span>Ungenutzte Tags entfernen</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4 text-blue-500" />
                      <span>Tag-Hierarchien erstellen</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Card Organization */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
                <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Karten-Organisation
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-4 w-4 text-green-500" />
                    Gruppierung
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                  <ul className="space-y-2">
                    <li>• Nach Themen gruppieren</li>
                    <li>• Nach Fragetyp sortieren</li>
                    <li>• Nach Schwierigkeit ordnen</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    Wichtig-Subset
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                  <ul className="space-y-2">
                    <li>• ~50 wichtigste Karten extrahieren</li>
                    <li>• Basierend auf Prüfungshäufigkeit</li>
                    <li>• Ankiphil-Style Lernkarten</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Copy className="h-4 w-4 text-green-500" />
                    Karten-Bewegung
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                  <ul className="space-y-2">
                    <li>• Zwischen Decks verschieben</li>
                    <li>• Für Subsets kopieren</li>
                    <li>• Nach Tags/Inhalt filtern</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Duplicates & Quality */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/50">
                <Search className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Duplikate & Qualität
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Duplikat-Erkennung</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <li className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-orange-500" />
                      Exakte Duplikate finden
                    </li>
                    <li className="flex items-center gap-2">
                      <Search className="h-3 w-3 text-orange-500" />
                      Ähnliche Fragen identifizieren
                    </li>
                    <li className="flex items-center gap-2">
                      <Merge className="h-3 w-3 text-orange-500" />
                      Automatisch zusammenführen
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-orange-500" />
                      Duplikat-Report generieren
                    </li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Qualitätskontrolle</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      Karten ohne Erklärung finden
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      Leere Optionen identifizieren
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      Ungültige Binärcodes prüfen
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                      Leere Karten markieren
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Statistiken & Übersicht
              </h3>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Beispiel-Report</CardTitle>
                <CardDescription>Detaillierte Statistiken für jedes Deck</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-lg">
                  <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
{`Orthopädie Deck:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 343 Karten total
   ├── 120 KPRIM
   ├── 150 MC
   └── 73 SC

🏷️  Tags: 0 (sollte organisiert werden)
📝 Erklärungen: 0 (können angereichert werden)

📚 Themen:
   ├── Hüfte (45 Karten)
   ├── Wirbelsäule (38 Karten)
   ├── Knie (32 Karten)
   └── Fuß/Sprunggelenk (28 Karten)`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Intelligent Features */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-900/50">
                <Brain className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Intelligente Features
              </h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-pink-500" />
                    Automatische Kategorisierung
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                  <ul className="space-y-2">
                    <li>• Themen automatisch aus Inhalt erkennen</li>
                    <li>• Schwierigkeit basierend auf Komplexität einschätzen</li>
                    <li>• Wichtigkeit für Subset-Erstellung bewerten</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-pink-500" />
                    Intelligente Vorschläge
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                  <ul className="space-y-2">
                    <li>• Deck-Struktur-Vorschläge</li>
                    <li>• Tag-Vorschläge basierend auf Inhalt</li>
                    <li>• Organisations-Empfehlungen</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Workflows Section */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Workflow className="mr-1 h-3 w-3" />
              Workflows
            </Badge>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Praktische Workflows
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/50 dark:to-zinc-950">
              <CardHeader>
                <CardTitle className="text-lg">Deck organisieren</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                <p className="italic mb-3">&quot;Organisiere mein Orthopädie-Deck&quot;</p>
                <ul className="space-y-1">
                  <li>→ Tags vergeben</li>
                  <li>→ Themen extrahieren</li>
                  <li>→ Statistiken zeigen</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-zinc-950">
              <CardHeader>
                <CardTitle className="text-lg">Wichtig-Subset</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                <p className="italic mb-3">&quot;Erstelle ein Wichtig-Subset mit 50 Karten&quot;</p>
                <ul className="space-y-1">
                  <li>→ Wichtigste Karten identifizieren</li>
                  <li>→ Sub-Deck erstellen</li>
                  <li>→ Karten kopieren</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/50 dark:to-zinc-950">
              <CardHeader>
                <CardTitle className="text-lg">Duplikate finden</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                <p className="italic mb-3">&quot;Finde Duplikate in meinen Decks&quot;</p>
                <ul className="space-y-1">
                  <li>→ Ähnliche Fragen finden</li>
                  <li>→ Zusammenführen vorschlagen</li>
                  <li>→ Report generieren</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-zinc-950">
              <CardHeader>
                <CardTitle className="text-lg">Qualität verbessern</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
                <p className="italic mb-3">&quot;Finde alle Karten ohne Erklärung&quot;</p>
                <ul className="space-y-1">
                  <li>→ Liste generieren</li>
                  <li>→ Automatisch anreichern</li>
                  <li>→ Synchronisieren</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Maintenance Section */}
      <section className="py-20 border-t border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Settings className="mr-1 h-3 w-3" />
              Wartung
            </Badge>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Wartung & Backup
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-zinc-500" />
                  Backup-System
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                Automatisches Backup vor größeren Operationen. Deine Daten sind sicher.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-zinc-500" />
                  Änderungsprotokoll
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                Vollständiges Protokoll aller Änderungen: Was, Wann, Warum.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-zinc-500" />
                  Batch-Operationen
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                Massen-Tagging, Massen-Verschiebung und Massen-Anreicherung in einem Schritt.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Roadmap / Priorities Section */}
      <section className="py-20 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-950">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Entwicklungs-Roadmap
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <Badge className="w-fit bg-green-600">Phase 1</Badge>
                <CardTitle className="text-lg mt-2">Grundlagen</CardTitle>
                <CardDescription>Höchste Priorität</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Tags automatisch vergeben
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Statistiken & Übersicht
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Karten ohne Erklärung finden
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <Badge className="w-fit bg-blue-600">Phase 2</Badge>
                <CardTitle className="text-lg mt-2">Organisation</CardTitle>
                <CardDescription>Hohe Priorität</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Wichtig-Subset erstellen
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Duplikate finden
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Deck-Hierarchie standardisieren
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-3">
                <Badge className="w-fit bg-yellow-600">Phase 3</Badge>
                <CardTitle className="text-lg mt-2">Erweitert</CardTitle>
                <CardDescription>Mittlere Priorität</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Themen-Tags extrahieren
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Nach Themen gruppieren
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Intelligente Vorschläge
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-zinc-200 dark:border-zinc-700">
              <CardHeader className="pb-3">
                <Badge className="w-fit" variant="secondary">Phase 4</Badge>
                <CardTitle className="text-lg mt-2">Wartung</CardTitle>
                <CardDescription>Niedrige Priorität</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Backup-System
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Änderungsprotokoll
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Batch-Operationen
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Question Types Section */}
      <section className="py-20 border-t border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Unterstützte Fragetypen
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-violet-600">KPRIM</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                <p className="mb-2">Multiple korrekte Antworten</p>
                <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">z.B. &quot;1 1 0 1&quot;</code>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-blue-600">MC</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                <p className="mb-2">Multiple Choice</p>
                <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">Eine korrekte Antwort</code>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-green-600">SC</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600 dark:text-zinc-400">
                <p className="mb-2">Single Choice</p>
                <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">Eine korrekte Antwort</code>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/adalbert.png"
                alt="Adalbert"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">Adalbert</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Anki MCP Server mit KI-Anreicherung
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm">GitHub</Button>
              <Button variant="ghost" size="sm">Dokumentation</Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

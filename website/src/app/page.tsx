'use client';

import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Dashboard from "@/components/Dashboard";
import { 
  BookOpen, 
  Brain, 
  CheckCircle,
  Sparkles,
  Lightbulb,
  FileText
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),transparent)]" />
        <div className="relative z-10 container mx-auto px-6 py-24 md:py-32">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8">
              <Image
                src="/adalbert.png"
                alt="Adalbert"
                width={150}
                height={150}
                priority
                className="rounded-full shadow-2xl ring-4 ring-blue-500/20"
              />
            </div>
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              MCP Server für Anki
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight text-zinc-900 md:text-6xl">
              Adalbert
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-zinc-600 md:text-xl">
              Ein intelligenter MCP-Server, der deine Anki-Prüfungsdecks mit 
              KI-generierten deutschen Erklärungen anreichert und organisiert.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a 
                href="https://github.com/ferdinandschweigert/adalbert/blob/main/README.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 h-10 px-8 bg-blue-600 text-white shadow hover:bg-blue-700"
              >
                <BookOpen className="mr-2 h-5 w-5 flex-shrink-0" />
                Dokumentation
              </a>
              <a 
                href="https://github.com/ferdinandschweigert/adalbert" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 h-10 px-8 border border-blue-200 bg-white text-blue-700 shadow-sm hover:bg-blue-50 hover:text-blue-800"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Dashboard */}
      <section className="border-t border-zinc-200 bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">
              Interaktives Dashboard
            </h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">
              Verwalte deine Anki-Decks direkt von hier aus
            </p>
          </div>
          <Dashboard />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-t border-zinc-200 bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">
              So funktioniert es
            </h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">
              Adalbert läuft als MCP-Server im Hintergrund und integriert sich nahtlos mit deinem Workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-blue-200">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>1. Decks lesen</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-zinc-600">
                Liest deine .apkg Dateien oder verbindet sich direkt mit Anki Desktop
              </CardContent>
            </Card>
            <Card className="border-blue-200">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>2. KI-Anreicherung</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-zinc-600">
                Generiert deutsche Erklärungen, Eselsbrücken und Referenzen via Gemini API
              </CardContent>
            </Card>
            <Card className="border-blue-200">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>3. Synchronisieren</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-zinc-600">
                Synchronisiert die angereicherten Karten direkt zu Anki Desktop - kein Import/Export nötig!
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Card Enrichment Section */}
      <section className="py-20 bg-zinc-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="mr-1 h-3 w-3" />
              Karten-Anreicherung
            </Badge>
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">
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
              <CardContent className="text-zinc-600">
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
              <CardContent className="text-zinc-600">
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
              <CardContent className="text-zinc-600">
                Gedächtnisstützen (Mnemonics) wenn anwendbar
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <FileText className="h-5 w-5" />
                  REFERENZ
                </CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-600">
                Verweise auf Lehrbücher und Leitlinien
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 bg-white">
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
              <span className="font-semibold text-zinc-900">Adalbert</span>
            </div>
            <p className="text-sm text-zinc-500 text-center">
              Anki MCP Server mit KI-Anreicherung
              <br />
              <span className="text-xs text-zinc-400">
                "Adalbert" is a personal project name. No copyright intended.
              </span>
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" className="whitespace-nowrap" asChild>
                <a href="https://github.com/ferdinandschweigert/adalbert" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap">
                  GitHub
                </a>
              </Button>
              <Button variant="ghost" size="sm" className="whitespace-nowrap" asChild>
                <a href="https://github.com/ferdinandschweigert/adalbert/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="whitespace-nowrap">
                  Dokumentation
                </a>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

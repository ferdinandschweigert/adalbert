#!/usr/bin/env python3
"""
Import M2 H25 Fragensammlung (studentisches Gedächtnisprotokoll, Google-Docs-PDF)
into website/data/altfragen-bank.json as a published exam.

Usage:
  python3 scripts/import-m2-h25-fragensammlung.py /path/to/M2-H25-Fragensammlung.pdf
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "website" / "data" / "altfragen-bank.json"
EXAM_ID = "m2-h25-gedaechtnisprotokoll"

OPT_SPLIT = re.compile(r"(?<![A-Za-zÄÖÜäöü0-9])([A-E])\)\s*")
VER_RE = re.compile(r"Version:\s*([A-C])\s*Tag\s*([123])", re.I)
ANS_RE = re.compile(r"(?:→\s*)?Richtige Antwort:\s*([A-E])\b", re.I)


def ns(s: str) -> str:
    s = (s or "").replace("\u00a0", " ")
    for a, b in (("ﬁ", "fi"), ("ﬂ", "fl"), ("ﬀ", "ff"), ("–", "-"), ("—", "-")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def looks_placeholder(s: str) -> bool:
    t = ns(s).lower()
    return (
        (not t)
        or t in {"?", "??", "…", "...", "jo", "x"}
        or "fragetext einfügen" in t
    )


def extract_pdf_text(pdf_path: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    parts: list[str] = []
    for i, page in enumerate(reader.pages):
        raw = page.extract_text() or ""
        parts.append(ns(raw.replace("\n", " ")))
        if (i + 1) % 100 == 0:
            print(f"  extracted page {i + 1}/{len(reader.pages)}")
    return "\n".join(parts)


def parse_options(body: str) -> tuple[list[str], str | None]:
    stop = ANS_RE.search(body)
    region = body[: stop.start()] if stop else body
    markers = list(OPT_SPLIT.finditer(region))
    if len(markers) < 2:
        return [], None
    start = None
    for i, m in enumerate(markers):
        if m.group(1) == "A" and i + 1 < len(markers) and markers[i + 1].group(1) == "B":
            start = i
    if start is None:
        return [], None
    used: list[tuple[str, re.Match[str]]] = []
    seen: set[str] = set()
    for m in markers[start:]:
        letter = m.group(1)
        if letter in seen:
            break
        if used and ord(letter) <= ord(used[-1][0]):
            break
        if used and ord(letter) > ord(used[-1][0]) + 2:
            break
        seen.add(letter)
        used.append((letter, m))
        if letter == "E":
            break
    if len(used) < 2:
        return [], None
    opts_map: dict[str, str] = {}
    for idx, (letter, m) in enumerate(used):
        st = m.end()
        en = used[idx + 1][1].start() if idx + 1 < len(used) else len(region)
        raw = ns(region[st:en])
        raw = re.sub(r"Kommentar \(optional\):.*", "", raw, flags=re.I)
        raw = re.sub(r"\[Anmerkung/Quelle\]", "", raw)
        raw = ns(raw).strip(" -;:")
        if looks_placeholder(raw) or len(raw) < 1:
            raw = "?"
        if len(raw) > 240:
            raw = re.split(r"\s+(?=(?:Ich |Ja |Nein|→|Kommentar|deshalb|deswegen))", raw)[0][:240]
        opts_map[letter] = raw
    last = max(ord(k) for k in opts_map)
    n = min(5, last - 64)
    options = [opts_map.get(chr(65 + i), "?") for i in range(n)]
    ans = None
    if stop:
        if stop.lastindex:
            ans = stop.group(1).upper()
        else:
            am = re.match(r"\s*([A-E])\b", body[stop.end() :], re.I)
            if am:
                ans = am.group(1).upper()
    return options, ans


def clean_stem(s: str) -> str:
    s = ns(s)
    s = re.sub(r"^\[+|\]+$", "", s).strip()
    s = re.sub(r"\s*[-]?\s*Version:.*$", "", s, flags=re.I)
    s = re.sub(r"\s*Kommentar \(optional\):.*$", "", s, flags=re.I)
    s = re.sub(r"\[Anmerkung/Quelle\]", "", s)
    s = re.sub(r"^Frage\s+\d+\s*(?:Version\s*[A-C])?\s*", "", s, flags=re.I)
    s = s.strip(" -]:).")
    s = re.sub(r"^\)\s*", "", s)
    return ns(s)


def parse_version_tagged(text: str) -> list[dict]:
    vers = list(VER_RE.finditer(text))
    out: list[dict] = []
    for i, m in enumerate(vers):
        ver, tag = m.group(1).upper(), int(m.group(2))
        look = text[max(0, m.start() - 500) : m.start()]
        nm = list(re.finditer(r"(?:^|[\s])(\d{1,3})\.\s*", look))
        if not nm:
            continue
        stem = clean_stem(look[nm[-1].end() :])
        if looks_placeholder(stem) or len(stem) < 18:
            continue
        end = vers[i + 1].start() if i + 1 < len(vers) else min(len(text), m.end() + 1800)
        options, ans = parse_options(text[m.end() : end])
        if not options or not ans:
            continue
        idx = ord(ans) - 65
        while idx >= len(options) and len(options) < 5:
            options.append("?")
        if idx >= len(options) or options[idx] == "?":
            continue
        real = sum(1 for o in options if o != "?")
        if real < 3:
            continue
        out.append(
            {
                "src": f"{ver}{tag}",
                "ver": ver,
                "tag": tag,
                "localNum": int(nm[-1].group(1)),
                "question": stem[:700],
                "options": options,
                "letter": ans,
                "n_real": real,
            }
        )
    return out


LOOSE_STEM_OK = re.compile(
    r"^(?:Fall|Pat(?:\.|ient(?:in)?)?|Frau|Mann|Kind|Säugling|Welche|Was |Wie |Wo |Wann |"
    r"Folgefrage|Zu |Ein |Eine |Der |Die |Das |\d{1,3}[-\s]?jährige)",
    re.I,
)


def parse_loose(text: str, existing_keys: set[str]) -> list[dict]:
    out: list[dict] = []
    for m in ANS_RE.finditer(text):
        letter = m.group(1).upper()
        region = text[max(0, m.start() - 900) : m.start()]
        options, _ = parse_options(region + " → Richtige Antwort: " + letter)
        if len(options) < 4:
            continue
        if sum(o != "?" for o in options) < 4:
            continue
        idx = ord(letter) - 65
        if idx >= len(options) or options[idx] == "?":
            continue
        markers = list(OPT_SPLIT.finditer(region))
        start_a = None
        for i, mm in enumerate(markers):
            if mm.group(1) == "A" and i + 1 < len(markers) and markers[i + 1].group(1) == "B":
                start_a = mm
        if not start_a:
            continue
        stem = ns(region[: start_a.start()])
        nm = list(re.finditer(r"(?:^|[\s])(\d{1,3})\.\s*", stem))
        local = 0
        if nm:
            local = int(nm[-1].group(1))
            stem = stem[nm[-1].end() :]
        stem = clean_stem(stem)
        if looks_placeholder(stem) or not (35 <= len(stem) <= 360):
            continue
        if "A)" in stem or "B)" in stem:
            continue
        low = stem.lower()
        if any(
            w in low
            for w in (
                "fragensammlung",
                "willkommen",
                "kommentar (optional)",
                "anmerkung/quelle",
                "ich glaube",
                "bin auch",
                "denke eher",
            )
        ):
            continue
        if not LOOSE_STEM_OK.search(stem):
            continue
        key = re.sub(r"\W+", "", stem[:90].lower())
        if key in existing_keys:
            continue
        existing_keys.add(key)
        out.append(
            {
                "src": "loose",
                "ver": "?",
                "tag": 0,
                "localNum": local,
                "question": stem[:700],
                "options": options[:5],
                "letter": letter,
                "n_real": sum(o != "?" for o in options),
            }
        )
    return out


def stem_key(q: dict, n: int = 70) -> str:
    return re.sub(r"\W+", "", q["question"].lower())[:n]


def is_mismatch(q: dict) -> bool:
    stem = q["question"].lower()
    opts = " ".join(q["options"]).lower()
    if "stand nichts" in stem:
        return True
    pairs = [
        ("parathormon", "lost to follow"),
        ("parathormon", "baseline"),
        ("somali", "baseline"),
        ("zystiskopie", "kammerflimmern"),
        ("histo", "kammerflimmern"),
        ("schulterschmerz", "nach who"),
        ("rheumatisches fieber", "okulomotorius"),
        ("cholesterin", "spondylitis"),
        ("ldl", "spondylitis"),
        ("juckreiz", "pankreatitis"),
        ("analregion", "pankreatitis"),
        ("centor", "atemfrequenz"),
        ("strep-st", "atemfrequenz"),
        ("halsschmerzen", "geschlecht"),
    ]
    for a, b in pairs:
        if a in stem and b in opts:
            return True
    return False


def dedupe(rows: list[dict]) -> list[dict]:
    best: dict[str, tuple[int, dict]] = {}
    for q in rows:
        if is_mismatch(q):
            continue
        stem = q["question"].lstrip(").] ")
        q = {**q, "question": stem}
        if q["question"].startswith(")"):
            continue
        key = stem_key(q)
        if len(key) < 12:
            continue
        score = q["n_real"] * 1000 + len(q["question"]) + (400 if q["src"] != "loose" else 0)
        if key not in best or score > best[key][0]:
            best[key] = (score, q)
    uniq = [v[1] for v in best.values()]
    uniq.sort(key=lambda q: (q["tag"] or 9, q["localNum"] or 999, q["ver"], q["question"]))
    return uniq


def links(term: str) -> list[dict]:
    q = (term or "").strip()[:100]
    q80 = q[:80]
    return [
        {"label": "Amboss (Login)", "url": f"https://next.amboss.com/de/search?q={quote(q)}"},
        {
            "label": "DocCheck Flexikon",
            "url": f"https://flexikon.doccheck.com/de/Spezial:Suche?search={quote(q80)}",
        },
        {"label": "Wikipedia", "url": f"https://de.wikipedia.org/w/index.php?search={quote(q)}"},
    ]


def topic_label(stem: str) -> str:
    words = re.findall(r"[A-Za-zÄÖÜäöüß0-9-]{3,}", stem)
    stop = {
        "eine",
        "einer",
        "einem",
        "eines",
        "der",
        "die",
        "das",
        "und",
        "mit",
        "bei",
        "nach",
        "welche",
        "welcher",
        "welches",
        "am",
        "ehesten",
        "patient",
        "patientin",
        "frau",
        "mann",
        "folgefrage",
        "version",
        "fall",
    }
    keep = [w for w in words if w.lower() not in stop][:4]
    return " ".join(keep)[:60] or "M2 H25"


def bits_for(letter: str, n: int) -> str:
    idx = ord(letter) - 65
    return "".join("1" if i == idx else "0" for i in range(n))


def build_question(q: dict, number: int) -> dict:
    letter = q["letter"]
    options = q["options"]
    n = len(options)
    bits = bits_for(letter, n)
    stem = q["question"]
    tag = q.get("tag") or 0
    ver = q.get("ver") or "?"
    local = q.get("localNum") or number
    prefix = f"[H25-T{tag}-{ver}-{local:03d}] " if tag else f"[H25-{local:03d}] "
    correct = options[ord(letter) - 65]
    topic = topic_label(stem)
    explanation = (
        f"Laut Gedächtnisprotokoll ist {letter} die markierte Lösung: {correct}. "
        f"Die Frage stammt aus der studentischen M2-H25-Fragensammlung und kann unvollständig "
        f"oder unsicher rekonstruiert sein."
    )
    rationales = []
    for i, opt in enumerate(options):
        correct_flag = bits[i] == "1"
        if opt == "?":
            text = (
                f"{'Richtig' if correct_flag else 'Falsch'} ({chr(65 + i)}): "
                "Option im Protokoll nicht überliefert."
            )
        elif correct_flag:
            text = (
                f"Richtig ({chr(65 + i)}): {opt}. "
                f"Das ist die im Protokoll markierte Lösung zum Fall „{stem[:160]}"
                f"{'…' if len(stem) > 160 else ''}“."
            )
        else:
            text = (
                f"Falsch ({chr(65 + i)}): {opt} — nicht die markierte Lösung "
                f"(richtig: {letter}). Fall: „{stem[:140]}{'…' if len(stem) > 140 else ''}“."
            )
        term = opt if opt not in ("?", "") else topic
        rationales.append(
            {
                "index": i,
                "correct": correct_flag,
                "text": text[:700],
                "links": links(term),
            }
        )
    return {
        "number": number,
        "question": prefix + stem,
        "options": options,
        "type": "SC",
        "correctAnswers": bits,
        "explanation": explanation,
        "topicLabel": topic,
        "optionRationales": rationales,
        "explanationMeta": {
            "source": "manual",
            "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "confidence": "low",
        },
    }


def main() -> int:
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/h25/M2-H25-Fragensammlung.pdf")
    if not pdf.exists():
        print(f"Missing PDF: {pdf}", file=sys.stderr)
        return 1

    cached = Path("/tmp/h25/full.txt")
    if cached.exists() and cached.stat().st_mtime >= pdf.stat().st_mtime:
        print("Using cached text", cached)
        text = cached.read_text()
    else:
        print("Extracting", pdf)
        text = extract_pdf_text(pdf)
        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_text(text)

    tagged = parse_version_tagged(text)
    keys = {re.sub(r"\W+", "", q["question"][:90].lower()) for q in tagged}
    loose = parse_loose(text, keys)
    uniq = dedupe(tagged + loose)
    print(
        f"parsed tagged={len(tagged)} loose={len(loose)} unique={len(uniq)} "
        f"letters={Counter(q['letter'] for q in uniq)} "
        f"real={Counter(q['n_real'] for q in uniq)}"
    )

    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    questions = [build_question(q, i + 1) for i, q in enumerate(uniq)]
    with_key = sum(1 for q in questions if "1" in q["correctAnswers"])
    exam = {
        "id": EXAM_ID,
        "title": "M2 H25 – Gedächtnisprotokoll",
        "sourceLabel": "Gedächtnisprotokoll M2 Herbst 2025",
        "description": (
            f"H25 (Herbst 2025): {len(questions)} rekonstruierte Fragen aus der studentischen "
            f"Fragensammlung, {with_key} mit markierter Lösung. Unvollständig und teils unsicher."
        ),
        "published": True,
        "createdAt": now,
        "updatedAt": now,
        "questions": questions,
    }

    bank = {"version": 1, "updatedAt": now, "exams": []}
    if BANK.exists():
        bank = json.loads(BANK.read_text())
        if not isinstance(bank.get("exams"), list):
            bank["exams"] = []
    others = [e for e in bank["exams"] if e.get("id") != EXAM_ID]
    bank = {"version": 1, "updatedAt": now, "exams": others + [exam]}
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {BANK}")
    print(f"Exam {EXAM_ID}: {len(questions)} questions, {with_key} with keys")
    print(f"Bank now has {len(bank['exams'])} exam(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

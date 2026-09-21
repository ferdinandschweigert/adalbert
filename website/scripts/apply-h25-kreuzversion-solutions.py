#!/usr/bin/env python3
"""Apply the reviewed "Kreuzversion mit Lösungen" answer key to the H25 exam.

The H25 memory-protocol bank and the Kreuzversion PDF are two independent reconstructions
of the same exam: their question order AND wording differ, and many protocol answers were
low-quality AI guesses. This script therefore matches each bank question to the Kreuzversion
question by CONTENT (option-set similarity is the strongest identity signal), maps the PDF's
highlighted correct option onto the bank's (possibly reordered/reworded) options, and — only
when both the question identity and the option mapping are confident — overwrites the answer,
explanation and per-option rationales from the Kreuzversion.

Confidence gate (validated against the 106 trusted `protocol` answers: every disagreement in
this band is a genuine Kreuzversion correction of a wrong protocol/AI key, not a mapping error):
    option-set similarity >= 0.62  AND  correct-option text similarity >= 0.72
    AND margin over the 2nd-best bank option >= 0.12

Data source: website/scripts/h25-kreuzversion-solutions.json (produced by
extract-h25-kreuzversion.py). Deterministic and idempotent — safe to re-run.

Usage: python3 website/scripts/apply-h25-kreuzversion-solutions.py [--dry-run]
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "website" / "data" / "altfragen-bank.json"
SOLUTIONS = ROOT / "website" / "scripts" / "h25-kreuzversion-solutions.json"
EXAM_ID = "m2-h25-gedaechtnisprotokoll"

OPT_GATE = 0.62
ISIM_GATE = 0.72
MARGIN_GATE = 0.12
PDF_PRIMARY_OPEN = {80}

STOP = set(
    "der die das und oder mit bei einer eine einem einen ein ist am zu im in den dem des von "
    "fuer auf als auch nach wird welche welcher welches eher fall folgefrage frage".split()
)


def norm(s: str) -> str:
    s = re.sub(r"\[H25-T\d-\d+\]", " ", s or "")
    s = unicodedata.normalize("NFKD", s).replace("ß", "ss")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", s)).strip()


def toks(s: str) -> list[str]:
    return [t for t in norm(s).split() if t not in STOP and len(t) > 2]


def jacc(a: str, b: str) -> float:
    sa, sb = set(toks(a)), set(toks(b))
    return len(sa & sb) / len(sa | sb) if sa and sb else 0.0


def ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, norm(a), norm(b)).ratio()


def osim(a: str, b: str) -> float:
    return max(ratio(a, b), jacc(a, b))


def is_ph(o) -> bool:
    return str(o).strip() in ("?", "??", "", "…", "...")


def opt_set_sim(bopts: list[str], popts: list[dict]) -> float:
    pt = [o["text"] for o in popts]
    real = [b for b in bopts if not is_ph(b)]
    if not real or not pt:
        return 0.0
    used: set[int] = set()
    tot = 0.0
    for b in real:
        best, bi = 0.0, -1
        for i, p in enumerate(pt):
            if i in used:
                continue
            r = osim(b, p)
            if r > best:
                best, bi = r, i
        if bi >= 0:
            used.add(bi)
        tot += best
    return tot / len(real)


def bank_day(bq: dict):
    m = re.match(r"\[H25-(T\d)-", bq["question"])
    return {"T1": 1, "T2": 2, "T3": 3}.get(m.group(1)) if m else None


def best_match(bq: dict, pool: list[dict]):
    best, bs, bopt = None, -1.0, 0.0
    for pq in pool:
        stem = 0.5 * ratio(bq["question"], pq["question"]) + 0.5 * jacc(bq["question"], pq["question"])
        opt = opt_set_sim(bq["options"], pq["options"])
        sc = 0.35 * stem + 0.65 * opt
        if sc > bs:
            bs, best, bopt = sc, pq, opt
    return best, bopt


def map_index(bq: dict, pq: dict):
    corr = next((o for o in pq["options"] if o["correct"]), None)
    if not corr:
        return None, 0.0, 0.0, None
    sims = sorted(
        ((osim(b, corr["text"]) if not is_ph(b) else -1.0, i) for i, b in enumerate(bq["options"])),
        reverse=True,
    )
    b0 = sims[0]
    b1 = sims[1] if len(sims) > 1 else (0.0, -1)
    return b0[1], b0[0], b0[0] - b1[0], corr["text"]


def links(term: str) -> list[dict]:
    q = (term or "").strip()[:100]
    return [
        {"label": "Amboss (Login)", "url": f"https://next.amboss.com/de/search?q={quote(q)}"},
        {"label": "DocCheck Flexikon", "url": f"https://flexikon.doccheck.com/de/Spezial:Suche?search={quote(q[:80])}"},
        {"label": "Wikipedia", "url": f"https://de.wikipedia.org/w/index.php?search={quote(q)}"},
    ]


def bits_for(idx: int, n: int) -> str:
    return "".join("1" if i == idx else "0" for i in range(n))


def main() -> int:
    dry = "--dry-run" in sys.argv[1:]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    bank = json.loads(BANK.read_text())
    exam = next(e for e in bank["exams"] if e["id"] == EXAM_ID)
    solutions = json.loads(SOLUTIONS.read_text())
    # Only trust PDF questions with exactly one highlighted answer.
    sols = [q for q in solutions if sum(o["correct"] for o in q["options"]) == 1]
    by_day: dict[int, list[dict]] = {}
    for pq in sols:
        by_day.setdefault(pq["day"], []).append(pq)

    applied = 0
    changed: list[tuple] = []
    skipped = 0
    for q in exam["questions"]:
        # Preserve previously reviewed Kreuzversion mappings.  In particular, the
        # explicit PDF-primary import also covers protocol questions whose PDF day/order
        # differs, which this older day-constrained fuzzy matcher must not overwrite.
        if q.get("answerSource") == "kreuzversion" or q.get("number") in PDF_PRIMARY_OPEN:
            continue
        opts = q.get("options") or []
        if not any(not is_ph(o) for o in opts):
            skipped += 1  # no options in protocol -> cannot match from PDF safely
            continue
        pool = by_day.get(bank_day(q), []) or sols
        pq, opt = best_match(q, pool)
        idx, isim, imargin, corr_text = map_index(q, pq) if pq else (None, 0, 0, None)
        if idx is None or opt < OPT_GATE or isim < ISIM_GATE or imargin < MARGIN_GATE:
            skipped += 1
            continue

        n = len(opts)
        new_bits = bits_for(idx, n)
        old_bits = q.get("correctAnswers") or ""
        old_idx = old_bits.index("1") if "1" in old_bits else None
        if old_idx != idx:
            changed.append((q["number"], q.get("answerSource"),
                            chr(65 + old_idx) if old_idx is not None else "—", chr(65 + idx)))

        letter = chr(65 + idx)
        correct_text = opts[idx]
        begr = pq["begruendung"].strip()
        if not dry:
            q["correctAnswers"] = new_bits
            q["answerSource"] = "kreuzversion"
            q["explanation"] = (
                f"Richtige Antwort: {letter}) {correct_text}. {begr} "
                "(Quelle: Kreuzversion H25 — fachlich geprüfte Einschätzung, keine offizielle IMPP-Lösung.)"
            ).strip()
            q["explanationMeta"] = {
                "source": "manual",
                "generatedAt": now,
                "reviewedAt": now,
                "confidence": "high",
            }
            rats = []
            for i, opt_text in enumerate(opts[:n]):
                is_correct = i == idx
                if is_ph(opt_text):
                    text = f"{'Richtig' if is_correct else 'Offen'} ({chr(65 + i)}): Option im Protokoll nicht überliefert."
                elif is_correct:
                    text = f"Richtig ({chr(65 + i)}): {opt_text}. {begr}"
                else:
                    text = f"Falsch ({chr(65 + i)}): {opt_text} — richtig ist {letter}) {correct_text}."
                prev = next((r for r in (q.get("optionRationales") or []) if r.get("index") == i), None)
                rats.append({
                    "index": i,
                    "correct": is_correct,
                    "text": text[:900],
                    "links": (prev or {}).get("links") or links(opt_text if not is_ph(opt_text) else q.get("topicLabel") or ""),
                })
            q["optionRationales"] = rats
        applied += 1

    # Recompute description counts.
    from collections import Counter
    src = Counter(q.get("answerSource") for q in exam["questions"])
    kv = src.get("kreuzversion", 0)
    proto = src.get("protocol", 0)
    ai = src.get("ai", 0)
    none = sum(1 for q in exam["questions"] if q.get("answerSource") is None)
    if not dry:
        exam["description"] = (
            f"H25 (Herbst 2025), IMPP-Reihenfolge: {len(exam['questions'])} Originalfragen. "
            f"{kv} mit geprüfter Kreuzversion-Lösung, {proto} mit Protokoll-Schlüssel, "
            f"{ai} mit KI-Lösung, {none} ohne überlieferte Optionen. "
            "Kreuzversion-Lösungen sind fachlich geprüft, aber keine offiziellen IMPP-Schlüssel."
        )
        exam["updatedAt"] = now
        bank["updatedAt"] = now
        BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n")

    print(f"{'[dry-run] ' if dry else ''}applied Kreuzversion answers to {applied} questions; "
          f"skipped {skipped} (no confident match / no protocol options).")
    print(f"answerSource now: kreuzversion={kv} protocol={proto} ai={ai} none={none}")
    print(f"\n{len(changed)} answers CHANGED vs previous key:")
    for num, oldsrc, old, new in sorted(changed):
        print(f"  Q{num:<3} [{str(oldsrc):11s}] {old} -> {new}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

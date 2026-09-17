#!/usr/bin/env python3
"""Extract clean H25 questions + highlighted correct answers from the "Kreuzversion mit
Lösungen" PDF into a committed JSON, so the answer import is reproducible without the PDF.

In that PDF the most-likely-correct option is visually highlighted (green row); in the text
layer this shows up as the option LETTER being rendered in white (0xffffff) instead of grey.
We use that signal to recover the correct answer, plus the "BEGRÜNDUNG" reasoning block.

Usage:
    pip install pymupdf
    python3 website/scripts/extract-h25-kreuzversion.py /path/to/H25_mit_Loesungen.pdf

Writes website/scripts/h25-kreuzversion-solutions.json.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import pymupdf  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.stderr.write("PyMuPDF is required: pip install pymupdf\n")
    raise

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "website" / "scripts" / "h25-kreuzversion-solutions.json"

WHITE = 0xFFFFFF
NUM_RE = re.compile(r"^(\d+)\.$")
LETTER_RE = re.compile(r"^([A-H])$")
TAG_RE = re.compile(r"^Tag\s+(\d+)$")
FOOTER_RE = re.compile(r"^-- \d+ of \d+ --$")


def extract(pdf_path: Path) -> list[dict]:
    doc = pymupdf.open(pdf_path)
    spans: list[dict] = []
    for pno in range(doc.page_count):
        for block in doc[pno].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for s in line["spans"]:
                    t = s["text"].strip()
                    if t:
                        spans.append({"t": t, "color": s["color"], "font": s["font"], "size": round(s["size"])})

    def is_qnum(s):
        return "IBMPlexMono-Medium" in s["font"] and s["size"] >= 10 and NUM_RE.match(s["t"])

    def is_letter(s):
        return "IBMPlexMono-Medium" in s["font"] and s["size"] <= 9 and LETTER_RE.match(s["t"])

    def is_section(s):
        return "IBMPlexMono" in s["font"] and s["size"] <= 8 and (
            "FALLSERIE" in s["t"] or "EINZELFRAGE" in s["t"] or "FRAGEN" in s["t"] or s["t"] == "FRAGE"
        )

    questions: list[dict] = []
    cur = None
    mode = None
    cur_opt = None
    day = 0
    seq = 0

    def flush_opt():
        nonlocal cur_opt
        if cur is not None and cur_opt is not None:
            cur["options"].append(cur_opt)
            cur_opt = None

    def flush_q():
        nonlocal cur
        if cur is not None:
            flush_opt()
            questions.append(cur)
            cur = None

    for s in spans:
        if FOOTER_RE.match(s["t"]):
            continue
        if TAG_RE.match(s["t"]) and s["size"] >= 14:
            flush_q()
            day = int(TAG_RE.match(s["t"]).group(1))
            continue
        if is_qnum(s):
            flush_q()
            seq += 1
            cur = {"seq": seq, "day": day, "number": int(NUM_RE.match(s["t"]).group(1)),
                   "question": "", "options": [], "begruendung": "", "correct_letter": None}
            mode = "q"
            continue
        if cur is None:
            continue
        if is_section(s):
            continue
        if is_letter(s):
            flush_opt()
            correct = s["color"] == WHITE
            cur_opt = {"letter": s["t"], "text": "", "correct": correct}
            if correct:
                cur["correct_letter"] = s["t"]
            mode = "opt"
            continue
        if s["t"] == "BEGRÜNDUNG":
            flush_opt()
            mode = "begr"
            continue
        txt = s["t"]
        if mode == "q":
            cur["question"] += (" " if cur["question"] else "") + txt
        elif mode == "opt" and cur_opt is not None:
            cur_opt["text"] += (" " if cur_opt["text"] else "") + txt
        elif mode == "begr":
            cur["begruendung"] += (" " if cur["begruendung"] else "") + txt
    flush_q()
    return questions


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("usage: extract-h25-kreuzversion.py <pdf>\n")
        return 2
    questions = extract(Path(sys.argv[1]))
    single = sum(1 for q in questions if sum(o["correct"] for o in q["options"]) == 1)
    OUT.write_text(json.dumps(questions, ensure_ascii=False, indent=1) + "\n")
    print(f"extracted {len(questions)} questions ({single} with exactly one highlighted answer)")
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

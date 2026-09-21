#!/usr/bin/env python3
"""Fill H25 protocol gaps from the reviewed Kreuzversion PDF extraction.

The memory protocol and the PDF are independent reconstructions, so question numbers do
not line up reliably.  The mapping below was reviewed case by case using the full stem,
case context and neighbouring questions.  Only entries with a complete option set and
exactly one highlighted answer are promoted to ``answerSource=kreuzversion``.

Questions for which the PDF is incomplete, image-dependent or absent intentionally stay
open.  This avoids inventing answer keys while still making the import deterministic.

Usage:
    python3 website/scripts/apply-h25-pdf-primary-source.py [--dry-run]
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "website" / "data" / "altfragen-bank.json"
SOLUTIONS = ROOT / "website" / "scripts" / "h25-kreuzversion-solutions.json"
EXAM_ID = "m2-h25-gedaechtnisprotokoll"

# Bank question number -> sequence number in h25-kreuzversion-solutions.json.
# These are the formerly option-less questions that can be identified unambiguously.
REVIEWED_MAPPING = {
    15: 34,
    16: 107,
    19: 26,
    23: 65,
    28: 42,
    31: 27,
    32: 28,
    36: 77,
    38: 11,
    55: 40,
    56: 82,
    58: 48,
    59: 49,
    60: 96,
    61: 97,
    63: 66,
    64: 191,
    65: 67,
    66: 101,
    68: 68,
    69: 78,
    70: 91,
    71: 72,
    72: 104,
    73: 95,
    74: 79,
    75: 92,
    76: 88,
    77: 18,
    79: 46,
    81: 47,
    82: 87,
    83: 100,
    84: 51,
    85: 50,
    86: 73,
    87: 52,
    88: 59,
    89: 81,
    90: 61,
    91: 62,
    92: 63,
    93: 89,
    94: 53,
    96: 94,
    97: 74,
    98: 55,
    99: 83,
    100: 98,
    101: 69,
    102: 70,
    103: 71,
    104: 56,
    105: 57,
    106: 58,
    142: 114,
    148: 122,
    149: 123,
    164: 135,
    171: 165,
    173: 166,
    195: 201,
    203: 170,
    213: 194,
    239: 235,
    246: 242,
    274: 270,
    312: 306,
}

# The PDF has real options for this image question, but no highlighted answer.
OPTIONS_ONLY_MAPPING = {80: 80}


def links(term: str) -> list[dict]:
    query = (term or "").strip()[:100]
    return [
        {"label": "Amboss (Login)", "url": f"https://next.amboss.com/de/search?q={quote(query)}"},
        {
            "label": "DocCheck Flexikon",
            "url": f"https://flexikon.doccheck.com/de/Spezial:Suche?search={quote(query[:80])}",
        },
        {"label": "Wikipedia", "url": f"https://de.wikipedia.org/w/index.php?search={quote(query)}"},
    ]


def prefix(question: dict) -> str:
    match = re.match(r"(\[H25-T\d-\d+\])", question.get("question", ""))
    if not match:
        raise ValueError(f"H25 tag missing from bank question {question.get('number')}")
    return match.group(1)


def correct_index(pdf_question: dict) -> int:
    indices = [index for index, option in enumerate(pdf_question["options"]) if option["correct"]]
    if len(indices) != 1:
        raise ValueError(
            f"PDF sequence {pdf_question['seq']} has {len(indices)} highlighted answers; expected exactly one"
        )
    return indices[0]


def apply_answer(question: dict, pdf_question: dict, now: str) -> None:
    options = [option["text"].strip() for option in pdf_question["options"]]
    if len(options) < 2 or any(not option for option in options):
        raise ValueError(f"PDF sequence {pdf_question['seq']} does not contain a complete option set")

    answer_index = correct_index(pdf_question)
    answer_letter = chr(65 + answer_index)
    answer_text = options[answer_index]
    rationale = pdf_question["begruendung"].strip()

    question["question"] = f"{prefix(question)} {pdf_question['question'].strip()}"
    question["options"] = options
    question["type"] = "SC"
    question["correctAnswers"] = "".join(
        "1" if index == answer_index else "0" for index in range(len(options))
    )
    question["answerSource"] = "kreuzversion"
    question["explanation"] = (
        f"Richtige Antwort: {answer_letter}) {answer_text}. {rationale} "
        "Quelle: H25-Kreuzversion mit Lösungen; fachliche Einschätzung, keine offizielle IMPP-Lösung."
    ).strip()
    question["topicLabel"] = pdf_question["question"].strip()[:140]
    question["explanationMeta"] = {
        "source": "manual",
        "generatedAt": now,
        "reviewedAt": now,
        "confidence": "high",
    }
    question["optionRationales"] = [
        {
            "index": index,
            "correct": index == answer_index,
            "text": (
                f"Richtig ({chr(65 + index)}): {option}. {rationale}"
                if index == answer_index
                else f"Falsch ({chr(65 + index)}): {option} — richtig ist {answer_letter}) {answer_text}."
            )[:900],
            "links": links(option),
        }
        for index, option in enumerate(options)
    ]


def apply_options_only(question: dict, pdf_question: dict, now: str) -> None:
    options = [option["text"].strip() for option in pdf_question["options"]]
    if len(options) < 2 or any(not option for option in options):
        raise ValueError(f"PDF sequence {pdf_question['seq']} does not contain a complete option set")

    question["question"] = f"{prefix(question)} {pdf_question['question'].strip()}"
    question["options"] = options
    question["type"] = "SC"
    question["correctAnswers"] = "0" * len(options)
    question.pop("answerSource", None)
    question["explanation"] = (
        "Die Antwortoptionen stammen aus der H25-Kreuzversion. Eine richtige Antwort ist dort für diese "
        "Bildfrage nicht markiert; ohne die zugehörige Abbildung bleibt der Lösungsschlüssel bewusst offen."
    )
    question["topicLabel"] = pdf_question["question"].strip()[:140]
    question["explanationMeta"] = {
        "source": "manual",
        "generatedAt": now,
        "reviewedAt": now,
        "confidence": "low",
    }
    question["optionRationales"] = [
        {
            "index": index,
            "correct": False,
            "text": f"Offen ({chr(65 + index)}): {option}. Ohne Bildbeilage ist keine sichere Bewertung möglich.",
            "links": links(option),
        }
        for index, option in enumerate(options)
    ]


def main() -> int:
    dry_run = "--dry-run" in sys.argv[1:]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    bank = json.loads(BANK.read_text())
    exam = next(exam for exam in bank["exams"] if exam["id"] == EXAM_ID)
    questions = {question["number"]: question for question in exam["questions"]}
    pdf_questions = {question["seq"]: question for question in json.loads(SOLUTIONS.read_text())}

    if set(REVIEWED_MAPPING) & set(OPTIONS_ONLY_MAPPING):
        raise ValueError("Answer and options-only mappings overlap")

    for bank_number, pdf_sequence in REVIEWED_MAPPING.items():
        question = questions[bank_number]
        if question.get("answerSource") not in {None, "kreuzversion"}:
            raise ValueError(
                f"Bank question {bank_number} now has protected source {question.get('answerSource')}"
            )
        apply_answer(question, pdf_questions[pdf_sequence], now)

    for bank_number, pdf_sequence in OPTIONS_ONLY_MAPPING.items():
        question = questions[bank_number]
        if question.get("answerSource") is not None:
            raise ValueError(f"Bank question {bank_number} unexpectedly gained an answer source")
        apply_options_only(question, pdf_questions[pdf_sequence], now)

    sources = Counter(question.get("answerSource") for question in exam["questions"])
    open_questions = [
        question["number"] for question in exam["questions"] if question.get("answerSource") is None
    ]
    placeholder_questions = [
        question["number"]
        for question in exam["questions"]
        if all(option.strip() in {"", "?", "??", "…", "..."} for option in question.get("options", []))
    ]

    exam["description"] = (
        f"H25 (Herbst 2025), IMPP-Reihenfolge: {len(exam['questions'])} rekonstruierte Fragen. "
        f"{sources.get('kreuzversion', 0)} mit Lösung aus der H25-Kreuzversion, "
        f"{sources.get('protocol', 0)} mit Protokoll-Schlüssel, "
        f"{sources.get('ai', 0)} mit gekennzeichneter KI-Lösung und "
        f"{len(open_questions)} ohne belastbaren Lösungsschlüssel. "
        "Kreuzversion-Lösungen sind fachlich geprüft, aber keine offiziellen IMPP-Schlüssel."
    )
    exam["updatedAt"] = now
    bank["updatedAt"] = now

    if not dry_run:
        BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n")

    marker = "[dry-run] " if dry_run else ""
    print(f"{marker}imported {len(REVIEWED_MAPPING)} complete PDF questions")
    print(f"{marker}imported options only for {len(OPTIONS_ONLY_MAPPING)} image question")
    print(
        f"{marker}sources: kreuzversion={sources.get('kreuzversion', 0)} "
        f"protocol={sources.get('protocol', 0)} ai={sources.get('ai', 0)} open={len(open_questions)}"
    )
    print(f"{marker}open question numbers: {open_questions}")
    print(f"{marker}questions still containing only placeholders: {placeholder_questions}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

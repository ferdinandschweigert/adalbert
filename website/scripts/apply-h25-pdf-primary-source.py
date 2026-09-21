#!/usr/bin/env python3
"""Rebuild the complete H25 exam from the reviewed Kreuzversion PDF extraction.

The PDF is the primary source for every H25 question. It contains 315 questions,
including an additional question 38b that the original extractor merged into question 38.
Questions explicitly labelled as not assessable without an image remain without an answer
key; no answer is invented.

Usage:
    python3 website/scripts/apply-h25-pdf-primary-source.py [--dry-run]
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "website" / "data" / "altfragen-bank.json"
SOLUTIONS = ROOT / "website" / "scripts" / "h25-kreuzversion-solutions.json"
EXAM_ID = "m2-h25-gedaechtnisprotokoll"


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


def split_question_38(question: dict) -> list[dict]:
    first_rationale, second_block = question["begruendung"].split("38b.", 1)
    second_stem = (
        "Im Krankenhaus zeigt das Kardiotokogramm Dezelerationen, es wird die Indikation "
        "zur Notsectio gestellt. Welches Anästhesieverfahren ist am ehesten zu wählen?"
    )
    return [
        {
            **question,
            "numberLabel": "38",
            "options": question["options"][:5],
            "begruendung": first_rationale.strip(),
        },
        {
            **question,
            "numberLabel": "38b",
            "question": second_stem,
            "options": question["options"][5:],
            "begruendung": second_block.replace(second_stem, "", 1).strip(),
        },
    ]


def normalize_pdf_questions(raw_questions: list[dict]) -> list[dict]:
    normalized = []
    for question in raw_questions:
        if question["seq"] == 38:
            normalized.extend(split_question_38(question))
        else:
            normalized.append({**question, "numberLabel": str(question["number"])})
    return normalized


def to_bank_question(pdf: dict, number: int, now: str) -> dict:
    options = [option["text"].strip() for option in pdf["options"]]
    correct_indices = [
        index for index, option in enumerate(pdf["options"]) if option["correct"]
    ]
    has_answer = len(correct_indices) == 1
    answer_index = correct_indices[0] if has_answer else -1
    answer_letter = chr(65 + answer_index) if has_answer else ""
    answer_text = options[answer_index] if has_answer else ""
    rationale = pdf["begruendung"].strip()

    question = {
        "number": number,
        "question": f"[H25-T{pdf['day']}-{pdf['numberLabel']}] {pdf['question'].strip()}",
        "options": options,
        "type": "SC",
        "correctAnswers": "".join(
            "1" if index == answer_index else "0" for index in range(len(options))
        ),
        "explanation": (
            f"Richtige Antwort: {answer_letter}) {answer_text}. {rationale} "
            "Quelle: H25-Kreuzversion mit Lösungen; fachliche Einschätzung, keine offizielle IMPP-Lösung."
            if has_answer
            else f"{rationale} Die PDF enthält für diese Bildfrage keinen markierten Lösungsschlüssel."
        ),
        "topicLabel": pdf["question"].strip()[:140],
        "explanationMeta": {
            "source": "manual",
            "generatedAt": now,
            "reviewedAt": now,
            "confidence": "high" if has_answer else "low",
        },
        "optionRationales": [],
    }

    if has_answer:
        question["answerSource"] = "kreuzversion"

    for index, option in enumerate(options):
        letter = chr(65 + index)
        if has_answer and index == answer_index:
            text = f"Richtig ({letter}): {option}. {rationale}"
        elif has_answer:
            text = f"Falsch ({letter}): {option} — richtig ist {answer_letter}) {answer_text}."
        else:
            text = f"Offen ({letter}): {option}. Ohne Bildbeilage ist keine sichere Bewertung möglich."
        question["optionRationales"].append(
            {
                "index": index,
                "correct": has_answer and index == answer_index,
                "text": text[:900],
                "links": links(option),
            }
        )
    return question


def main() -> int:
    dry_run = "--dry-run" in sys.argv[1:]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    bank = json.loads(BANK.read_text())
    exam = next(exam for exam in bank["exams"] if exam["id"] == EXAM_ID)
    raw_pdf_questions = json.loads(SOLUTIONS.read_text())
    pdf_questions = normalize_pdf_questions(raw_pdf_questions)
    questions = [
        to_bank_question(question, number, now)
        for number, question in enumerate(pdf_questions, start=1)
    ]

    solved = sum(question.get("answerSource") == "kreuzversion" for question in questions)
    open_questions = [question["number"] for question in questions if not question.get("answerSource")]

    if len(questions) != 315 or solved != 308 or len(open_questions) != 7:
        raise ValueError(
            f"Unexpected PDF totals: questions={len(questions)}, solved={solved}, open={open_questions}"
        )

    exam["sourceLabel"] = "H25 mit Lösungen.pdf"
    exam["questions"] = questions
    exam["description"] = (
        f"H25 (Herbst 2025) vollständig auf Grundlage der neuen Kreuzversion-PDF: "
        f"{len(questions)} rekonstruierte Fragen, davon {solved} mit markierter Lösung und "
        f"{len(open_questions)} bildabhängige Fragen ohne Lösungsschlüssel. Die Kreuzversion-Lösungen "
        "sind fachliche Einschätzungen und keine offiziellen IMPP-Schlüssel."
    )
    exam["updatedAt"] = now
    bank["updatedAt"] = now

    if not dry_run:
        BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n")

    marker = "[dry-run] " if dry_run else ""
    print(f"{marker}rebuilt H25 from all {len(questions)} PDF questions")
    print(f"{marker}solved={solved} open={len(open_questions)}")
    print(f"{marker}open question numbers: {open_questions}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

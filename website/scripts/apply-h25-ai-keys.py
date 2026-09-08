#!/usr/bin/env python3
"""Apply AI-suggested keys to H25 questions that have no protocol mark."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / "website" / "data" / "altfragen-bank.json"
EXAM_ID = "m2-h25-gedaechtnisprotokoll"

# 1-based exam question number -> AI-suggested letter. Protocol keys are never overwritten.
AI_KEYS: dict[int, str] = {
    2: "B",
    3: "B",
    9: "B",
    17: "A",
    18: "A",
    20: "A",
    21: "A",
    24: "D",
    25: "C",
    27: "A",
    29: "A",
    30: "E",
    33: "A",
    34: "A",
    37: "C",
    39: "B",
    40: "E",
    41: "B",
    42: "A",
    43: "A",
    44: "A",
    45: "C",
    46: "D",
    47: "A",
    48: "A",
    49: "A",
    50: "C",
    51: "E",
    52: "E",
    54: "C",
    57: "E",
    62: "A",
    67: "A",
    95: "A",
    107: "A",
    111: "E",
    112: "B",
    113: "A",
    114: "A",
    116: "E",
    117: "A",
    118: "A",
    119: "C",
    120: "A",
    121: "C",
    126: "A",
    128: "C",
    129: "D",
    130: "A",
    131: "C",
    132: "A",
    135: "D",
    137: "B",
    138: "C",
    139: "A",
    140: "B",
    141: "D",
    143: "C",
    144: "A",
    145: "D",
    146: "D",
    147: "A",
    150: "A",
    151: "C",
    152: "B",
    157: "B",
    159: "C",
    161: "A",
    162: "A",
    163: "C",
    165: "C",
    166: "C",
    167: "A",
    168: "E",
    172: "E",
    176: "C",
    178: "B",
    179: "B",
    180: "C",
    181: "C",
    182: "E",
    183: "B",
    184: "C",
    185: "C",
    186: "C",
    187: "E",
    188: "D",
    189: "A",
    190: "A",
    191: "C",
    192: "B",
    193: "A",
    194: "B",
    196: "A",
    197: "A",
    200: "D",
    202: "A",
    204: "C",
    205: "B",
    207: "A",
    209: "A",
    210: "B",
    211: "E",
    212: "E",
    218: "E",
    220: "A",
    223: "C",
    224: "C",
    229: "A",
    230: "A",
    231: "A",
    235: "A",
    242: "E",
    243: "C",
    244: "C",
    247: "B",
    248: "D",
    275: "A",
    276: "B",
    278: "A",
    283: "A",
    284: "A",
    287: "C",
    288: "D",
    292: "A",
    293: "A",
    294: "A",
    296: "A",
    298: "A",
    299: "A",
    300: "A",
    307: "C",
    308: "B",
    310: "B",
    314: "A",
    315: "B",
    317: "D",
    320: "A",
}


def links(term: str) -> list[dict]:
    q = (term or "").strip()[:100]
    return [
        {"label": "Amboss (Login)", "url": f"https://next.amboss.com/de/search?q={quote(q)}"},
        {
            "label": "DocCheck Flexikon",
            "url": f"https://flexikon.doccheck.com/de/Spezial:Suche?search={quote(q[:80])}",
        },
        {"label": "Wikipedia", "url": f"https://de.wikipedia.org/w/index.php?search={quote(q)}"},
    ]


def bits_for(letter: str, n: int) -> str:
    idx = ord(letter) - 65
    return "".join("1" if i == idx else "0" for i in range(n))


def main() -> int:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    bank = json.loads(BANK.read_text())
    exam = next(e for e in bank["exams"] if e["id"] == EXAM_ID)
    applied = 0
    skipped_protocol = 0
    skipped_no_options = 0
    missing = []
    for q in exam["questions"]:
        bits = q.get("correctAnswers") or ""
        if "1" in bits:
            if q.get("answerSource") != "ai":
                q.setdefault("answerSource", "protocol")
                skipped_protocol += 1
            continue
        opts = q.get("options") or ["?", "?", "?", "?", "?"]
        real = sum(1 for o in opts if o and str(o).strip() not in ("?", "??"))
        if real < 1:
            skipped_no_options += 1
            continue
        letter = AI_KEYS.get(q["number"])
        if not letter:
            missing.append(q["number"])
            continue
        n = max(len(opts), 5)
        while len(opts) < n:
            opts.append("?")
        idx = ord(letter) - 65
        if idx < 0 or idx >= n:
            missing.append(q["number"])
            continue
        # Q33: "A Mukoviszidose" remained in the stem; recover original option text.
        if q["number"] == 33 and str(opts[0]).strip() in ("?", "??"):
            stem = q.get("question") or ""
            if "Mukoviszidose" in stem:
                opts[0] = "Mukoviszidose"
                q["question"] = stem.replace(" A Mukoviszidose", "").replace("A Mukoviszidose", "").rstrip()
        if str(opts[idx]).strip() in ("?", "??", ""):
            missing.append(q["number"])
            continue
        q["options"] = opts[:n]
        q["correctAnswers"] = bits_for(letter, n)
        q["answerSource"] = "ai"
        correct = opts[idx]
        q["explanation"] = (
            f"KI-generierte Lösung (nicht im Originalprotokoll markiert): {letter}) {correct}. "
            "Das ist ein fachlicher Vorschlag anhand der überlieferten Vignette und Optionen — "
            "kein IMPP-Schlüssel. Bitte kritisch prüfen."
        )
        q["explanationMeta"] = {
            "source": "llm",
            "generatedAt": now,
            "confidence": "low",
        }
        rats = []
        for i, opt in enumerate(opts[:n]):
            correct_flag = i == idx
            if opt in ("?", "??", ""):
                text = (
                    f"{'Richtig' if correct_flag else 'Offen'} ({chr(65 + i)}): "
                    "Option im Originalprotokoll nicht überliefert."
                )
            elif correct_flag:
                text = (
                    f"Richtig ({chr(65 + i)}), KI-Vorschlag: {opt}. "
                    "Nicht im Gedächtnisprotokoll markiert."
                )
            else:
                text = (
                    f"Falsch ({chr(65 + i)}), KI-Vorschlag: {opt} — "
                    f"als Lösung vorgeschlagen ist {letter}."
                )
            prev = next((r for r in (q.get("optionRationales") or []) if r.get("index") == i), None)
            rats.append(
                {
                    "index": i,
                    "correct": correct_flag,
                    "text": text[:900],
                    "links": (prev or {}).get("links") or links(opt if opt not in ("?", "") else q.get("topicLabel") or ""),
                }
            )
        q["optionRationales"] = rats
        applied += 1

    keyed = sum(1 for q in exam["questions"] if "1" in (q.get("correctAnswers") or ""))
    ai = sum(1 for q in exam["questions"] if q.get("answerSource") == "ai")
    proto = sum(1 for q in exam["questions"] if q.get("answerSource") == "protocol")
    exam["description"] = (
        f"H25 (Herbst 2025), IMPP-Reihenfolge: {len(exam['questions'])} Originalfragen. "
        f"{proto} mit Protokoll-Schlüssel, {ai} mit KI-generierter Lösung (gekennzeichnet). "
        "Fehlende Optionen bleiben nicht überliefert."
    )
    exam["updatedAt"] = now
    bank["updatedAt"] = now
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n")
    print(
        f"applied {applied} AI keys; protocol {skipped_protocol}; "
        f"no_options {skipped_no_options}; keyed_total {keyed}; missing {missing}"
    )
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())

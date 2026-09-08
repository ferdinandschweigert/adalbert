#!/usr/bin/env python3
"""
Import M2 H25 Fragensammlung as original protocol questions only.

Uses the IMPP-ordered index (Tag 1–3 = 320 items) and the matching
"Tag N geordnet" bodies. Does not invent stems, options, or answer keys.
Missing options stay "?" (nicht überliefert). Unmarked answers stay empty.

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

OPT_SPLIT = re.compile(r"(?<![A-Za-zÄÖÜäöü0-9])([A-E])\s*\)\s*")
ANS_RE = re.compile(
    r"(?:→\s*)?(?:Richtige\s+Antwort|Antwort)\s*:?\s*([A-E])\b",
    re.I,
)
TITLE_START = (
    r"(?:[A-ZÄÖÜ]|[1-9]\d{0,2}-jährige|[1-9]\d{0,2}\s+jährige|"
    r"[1-9]\d?\s+(?:Monate|Wochen|Tage)|Eltern |Pharmareferentin|"
    r"Infektionsschutzgesetz|Adipositas|Schwangere|Reha-Sportgruppe)"
)
Q88_TITLES = {
    1: "82-jähriger Mann, Juckende Hautveränderungen (Bildbeilage), Antikörperdiagnostik",
    2: "31-jähriger Mann, Hauterscheinung Kinn (Bildbeilage), Therapie",
    3: "19-jähriger Auszubildender, nässende Vertiefung Ohrmuschel (Bildbeilage), klinischer Verlauf",
}
OPTION_CUT = re.compile(
    r"\s+(?=(?:Ich |Ja,|Ja |Nein,|Wieso |→|Kommentar|deshalb|deswegen|Anfecht|"
    r"Antwort|Dachte |hätte |Warum |In der Frage|oder [A-E]\b|Nicht [A-E]|"
    r"F\)|Correct me|chat gpt|ChatGPT|hätte auch|Aber [A-E]\b|"
    r"\(War |Quatsch|ja TBZ))"
)
STEM_CUT = re.compile(
    r"\s+(?:Kommentar|Ich |Wieso |Anfecht|Dachte |hätte auch|Correct me|chat gpt)",
    re.I,
)


def ns(s: str) -> str:
    s = (s or "").replace("\u00a0", " ")
    for a, b in (("ﬁ", "fi"), ("ﬂ", "fl"), ("ﬀ", "ff"), ("–", "-"), ("—", "-")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def spaced_digits(n: int) -> str:
    return r"\s*".join(map(re.escape, str(n)))


def looks_placeholder(s: str) -> bool:
    t = ns(s).lower()
    return (not t) or t in {"?", "??", "…", "...", "jo", "x"} or "fragetext einfügen" in t


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


def parse_index(block: str, expected_max: int, tag: int) -> list[dict]:
    """Original IMPP titles only. Recovers leftover 88/106 text; never invents titles."""
    raw = ns(block)
    raw = re.sub(r"TAG_\d IMPP Reihenfolge", "", raw)
    raw = re.sub(r"Tag \d Reihenfolge", " ", raw)
    raw = re.sub(r"\bA B Frage\b", " ", raw)
    raw = ns(raw)
    heads: list[tuple[int, int | None, int | None, int | None]] = []
    pos = 0
    for n in range(1, expected_max + 1):
        with_ver = re.compile(rf"(?:^|\s){n}\s+(\d{{1,3}})\s+(?={TITLE_START})")
        no_ver = re.compile(rf"(?:^|\s){n}\s+(?={TITLE_START})")
        m = with_ver.search(raw, pos)
        m2 = no_ver.search(raw, pos)
        chosen = None
        if m and m.start() < pos + 2500:
            chosen = ("ver", m)
        if m2 and m2.start() < pos + 2500:
            if chosen is None or m2.start() < chosen[1].start() - 3:
                chosen = ("no", m2)
        if chosen is None:
            heads.append((n, None, None, None))
            continue
        kind, match = chosen
        ver = int(match.group(1)) if kind == "ver" else None
        heads.append((n, ver, match.start(), match.end()))
        pos = match.end()

    out: list[dict] = []
    for i, (n, ver, _hs, ts) in enumerate(heads):
        next_hs = None
        for j in range(i + 1, len(heads)):
            if heads[j][2] is not None:
                next_hs = heads[j][2]
                break
        if ts is None:
            out.append({"impp": n, "ver": ver, "title": "", "tag": tag})
            continue
        title = ns(raw[ts : next_hs if next_hs is not None else ts + 300])
        out.append({"impp": n, "ver": ver, "title": title, "tag": tag})

    row88 = out[87]
    prev = out[86]
    for marker in (
        "82-jähriger Mann, Juckende",
        "31-jähriger Mann, Hauterscheinung",
        "19-jähriger Auszubildender",
    ):
        p = prev["title"].find(marker)
        if p >= 0:
            row88["title"] = ns(prev["title"][p:])
            prev["title"] = ns(prev["title"][:p])
            prev["title"] = re.sub(r"\s+\d{1,3}$", "", prev["title"])
            break
    else:
        if not row88["title"]:
            row88["title"] = Q88_TITLES[tag]

    for r in out:
        r["title"] = re.sub(r"diagnostikik$", "diagnostik", ns(r["title"]))
        if not r["title"] and r["impp"] == 88:
            r["title"] = Q88_TITLES[tag]
    return out


TITLE_STOP = {
    "jährige", "jähriger", "jährige", "jähriges", "patient", "patientin",
    "mann", "frau", "nach", "oder", "eine", "einem", "einer", "aufgrund",
    "wegen", "ohne", "beim", "mit", "und", "bild", "bildbeilage",
    "beurteilung", "situation",
}


def title_tokens(title: str) -> list[str]:
    raw = re.findall(r"[A-Za-zÄÖÜäöüß0-9-]{4,}", ns(title))
    out = []
    for w in raw:
        w = re.sub(r"^\d+-?", "", w)
        w = w.lstrip("-")
        if len(w) < 4:
            continue
        if w.lower() in TITLE_STOP or w.lower().rstrip("s") in TITLE_STOP:
            continue
        out.append(w)
    return out


def heading_plausible(after: str, title: str) -> bool:
    tw = [w.lower() for w in title_tokens(title)]
    if not tw:
        return True
    al = after.lower()
    long = max(tw, key=len)
    if len(long) >= 10 and long not in al and long[:8] not in al:
        return False
    hits = sum(1 for w in tw[:6] if w in al or (len(w) >= 8 and w[:8] in al))
    return hits >= min(2, len(tw))


def find_numeric(body: str, impp: int, ver: int | None) -> re.Match[str] | None:
    if ver is None:
        return None
    pat = re.compile(
        rf"(?:^|\s){spaced_digits(impp)}\s+{spaced_digits(ver)}\s+(?={TITLE_START})"
    )
    return pat.search(body)


def iter_title_matches(body: str, title: str):
    words = title_tokens(title)
    combos: list[list[str]] = []
    if len(words) >= 4:
        combos.append(words[-4:])
    if len(words) >= 3:
        combos.append(words[-3:])
        combos.append(words[:3])
    if len(words) >= 5:
        combos.append(words[:3] + words[-2:])
    for w in words:
        if len(w) >= 11:
            combos.append([w])
    seen_pos: set[int] = set()
    seen_combo: set[tuple[str, ...]] = set()
    for combo in combos:
        key = tuple(w.lower() for w in combo)
        if key in seen_combo:
            continue
        if len(combo) < 3 and not (len(combo) == 1 and len(combo[0]) >= 11):
            continue
        seen_combo.add(key)
        parts = []
        for w in combo:
            if len(combo) == 1 and len(w) >= 11:
                parts.append(re.escape(w))
            elif len(w) >= 6:
                parts.append(re.escape(w[:6]) + r".{0,12}")
            else:
                parts.append(re.escape(w))
        pat = re.compile(r".{0,20}".join(parts), re.I)
        for m in pat.finditer(body):
            if m.start() in seen_pos:
                continue
            seen_pos.add(m.start())
            yield m


def find_title(body: str, title: str) -> re.Match[str] | None:
    for m in iter_title_matches(body, title):
        return m
    return None


def locate_in_source(source: str, row: dict) -> int | None:
    m = find_numeric(source, row["impp"], row["ver"])
    if m and heading_plausible(source[m.end() : m.end() + 160], row["title"]):
        return m.start()
    for m in iter_title_matches(source, row["title"]):
        window = source[m.start() : m.start() + 240]
        if heading_plausible(window, row["title"]):
            return m.start()
    return None


def split_chunks(
    geo: str, ungeo: str, rows: list[dict]
) -> dict[int, tuple[str, str]]:
    """impp -> (chunk, source_name). Chunks are original slices only."""
    geo_pos: dict[int, int] = {}
    ug_pos: dict[int, int] = {}
    used_geo: set[int] = set()
    used_ug: set[int] = set()

    def first_free(source: str, row: dict, used: set[int]) -> int | None:
        cands: list[int] = []
        m = find_numeric(source, row["impp"], row["ver"])
        if m and heading_plausible(source[m.end() : m.end() + 160], row["title"]):
            cands.append(m.start())
        for tm in iter_title_matches(source, row["title"]):
            window = source[tm.start() : tm.start() + 240]
            if heading_plausible(window, row["title"]):
                cands.append(tm.start())
        for p in cands:
            if p not in used:
                return p
        return None

    for row in rows:
        p = first_free(geo, row, used_geo)
        if p is not None:
            geo_pos[row["impp"]] = p
            used_geo.add(p)
            continue
        p = first_free(ungeo, row, used_ug)
        if p is not None:
            ug_pos[row["impp"]] = p
            used_ug.add(p)

    chunks: dict[int, tuple[str, str]] = {}

    def fill(positions: dict[int, int], source: str, name: str) -> None:
        ordered = sorted(positions.items(), key=lambda kv: (kv[1], kv[0]))
        for i, (impp, start) in enumerate(ordered):
            end = len(source)
            for j in range(i + 1, len(ordered)):
                if ordered[j][1] > start:
                    end = ordered[j][1]
                    break
            end = min(end, start + 4500)
            if end <= start:
                continue
            chunks[impp] = (source[start:end], name)

    fill(geo_pos, geo, "geordnet")
    fill(ug_pos, ungeo, "ungeordnet")
    return chunks


def parse_options(body: str) -> tuple[list[str], str | None]:
    """Original A–E options + marked key from this chunk only."""
    stops = list(ANS_RE.finditer(body))
    ans: str | None = None
    cut_at = None
    # Always cut option text at "Richtige Antwort" / "Antwort X", even if no letter follows.
    bare_cut = re.search(r"(?:→\s*)?(?:Richtige\s+Antwort|Antwort)\s*:", body, re.I)
    if bare_cut:
        cut_at = bare_cut.start()
    if stops:
        rich = [m for m in stops if "richtige" in m.group(0).lower()]
        if rich:
            letters = {m.group(1).upper() for m in rich}
            if len(letters) == 1:
                ans = rich[0].group(1).upper()
            cut_at = rich[0].start()
        else:
            letters = {m.group(1).upper() for m in stops}
            if len(letters) == 1:
                ans = stops[0].group(1).upper()
            cut_at = stops[0].start()
    region = body[:cut_at] if cut_at is not None else body
    if cut_at is None:
        region = re.split(
            r"\s(?:Kommentar \(optional\)|Ich |Ja,|Nein,|Wieso |Anfecht)",
            region,
            maxsplit=1,
        )[0]
    markers = list(OPT_SPLIT.finditer(region))
    if len(markers) < 2:
        return [], ans
    start = None
    for i, m in enumerate(markers):
        if i + 1 < len(markers) and ord(markers[i + 1].group(1)) == ord(m.group(1)) + 1:
            if m.group(1) in {"A", "B"}:
                start = i
                break
    if start is None:
        return [], ans
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
        return [], ans
    opts_map: dict[str, str] = {}
    for idx, (letter, m) in enumerate(used):
        st = m.end()
        en = used[idx + 1][1].start() if idx + 1 < len(used) else len(region)
        raw = ns(region[st:en])
        raw = re.sub(r"Kommentar \(optional\):.*", "", raw, flags=re.I)
        raw = re.sub(r"\[Anmerkung/Quelle\]", "", raw)
        raw = OPTION_CUT.split(raw)[0]
        raw = re.sub(r"\s+Antwort\b.*$", "", raw, flags=re.I)
        raw = re.sub(r"\s+Richtige\s*$", "", raw, flags=re.I)
        raw = re.split(r"\s*->\s*", raw)[0]
        raw = ns(raw).strip(" -;:")
        if looks_placeholder(raw) or len(raw) < 1:
            raw = "?"
        if len(raw) > 200:
            raw = raw[:200].rsplit(" ", 1)[0]
        opts_map[letter] = raw or "?"
    n = min(5, max(ord(k) for k in opts_map) - 64)
    options = [opts_map.get(chr(65 + i), "?") for i in range(n)]
    while len(options) < 5:
        options.append("?")
    return options[:5], ans


def original_stem(title: str, chunk: str, options: list[str], impp: int, ver: int | None) -> str:
    """Prefer original vignette before A) if present; else original index title."""
    text = chunk or ""
    if ver is not None:
        text = re.sub(
            rf"^(?:\s*){spaced_digits(impp)}\s+{spaced_digits(ver)}\s+",
            "",
            text,
            count=1,
        )
    else:
        text = re.sub(rf"^(?:\s*){spaced_digits(impp)}\s+", "", text, count=1)
    if options and text:
        am = OPT_SPLIT.search(text)
        if am:
            before = ns(text[: am.start()])
            before = STEM_CUT.split(before)[0]
            before = ns(before)
            if len(before) >= 40 and "fragensammlung" not in before.lower():
                if title and title[:24].lower() not in before.lower():
                    before = ns(f"{title} {before}")
                return before[:900]
    return ns(title)[:700]


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


def topic_label(stem: str, title: str) -> str:
    src = title if title else stem
    src = re.sub(r"^\[H25-[^\]]+\]\s*", "", src)
    words = re.findall(r"[A-Za-zÄÖÜäöüß0-9-]{3,}", src)
    stop = {
        "eine", "einer", "einem", "eines", "der", "die", "das", "und", "mit", "bei",
        "nach", "welche", "welcher", "welches", "am", "ehesten", "patient", "patientin",
        "frau", "mann", "folgefrage", "version", "fall", "jährige", "jähriger",
        "aufgrund", "wegen",
    }
    keep = [w for w in words if w.lower() not in stop][:6]
    return " ".join(keep)[:70] or "M2 H25"


def bits_for(letter: str | None, n: int) -> str:
    if not letter:
        return "0" * n
    idx = ord(letter) - 65
    if idx < 0 or idx >= n:
        return "0" * n
    return "".join("1" if i == idx else "0" for i in range(n))


def amboss_explanation(
    *,
    title: str,
    stem: str,
    options: list[str],
    letter: str | None,
    bits: str,
    tag: int,
    impp: int,
) -> tuple[str, str]:
    """Overlay on original content only — never invents a key or option."""
    vignette = re.sub(r"^\[H25-[^\]]+\]\s*", "", stem)
    if letter and "1" in bits:
        idx = ord(letter) - 65
        correct = options[idx] if 0 <= idx < len(options) else "?"
        others = [
            f"{chr(65 + i)} ({opt})"
            for i, opt in enumerate(options)
            if chr(65 + i) != letter and opt != "?"
        ]
        other_txt = "; ".join(others[:4])
        explanation = (
            f"Laut studentischem H25-Gedächtnisprotokoll (IMPP Tag {tag}, Nr. {impp}) "
            f"ist {letter} die markierte Lösung: {correct}. "
            f"Der Originaltitel lautet: {title}. "
            f"Die überlieferte Vignette: {vignette[:420]}{'…' if len(vignette) > 420 else ''} "
            f"{letter} ist damit die im Protokoll gekennzeichnete Antwort; "
            f"die übrigen überlieferten Optionen"
            f"{(' — ' + other_txt) if other_txt else ''} — "
            f"sind nicht als Lösung markiert. "
            "Keine nachträgliche Schlüssel-Erfindung; Unsicherheiten des Protokolls bleiben erhalten. "
            "Zur Vertiefung: Amboss, Flexikon und Wikipedia über die Links an den Optionen."
        )
        return explanation, "low"
    explanation = (
        f"Für Tag {tag} Nr. {impp} ist im Originalprotokoll keine eindeutige "
        f"markierte Lösung überliefert. Originaltitel: {title}. "
        "Optionen nur soweit im Protokoll vorhanden; Lücken bleiben „nicht überliefert“. "
        "Es wird kein Lösungsschlüssel medizinisch ergänzt."
    )
    return explanation, "low"


def build_question(row: dict, number: int, now: str) -> dict:
    options = row["options"] or ["?", "?", "?", "?", "?"]
    letter = row.get("letter")
    n = len(options)
    bits = bits_for(letter, n)
    stem = row["question"]
    tag = row["tag"]
    impp = row["impp"]
    prefix = f"[H25-T{tag}-{impp:03d}] "
    topic = topic_label(stem, row.get("title") or "")
    explanation, conf = amboss_explanation(
        title=row.get("title") or "",
        stem=prefix + stem,
        options=options,
        letter=letter,
        bits=bits,
        tag=tag,
        impp=impp,
    )
    if not (letter and "1" in bits):
        letter = letter or "?"
    rationales = []
    for i, opt in enumerate(options):
        correct_flag = bits[i] == "1" if bits else False
        if opt == "?":
            text = (
                f"{'Richtig' if correct_flag else 'Offen'} ({chr(65 + i)}): "
                "Option im Originalprotokoll nicht überliefert."
            )
        elif correct_flag:
            text = (
                f"Richtig ({chr(65 + i)}): {opt}. "
                "Das ist die im H25-Originalprotokoll markierte Lösung. "
                f"Fallbezug: „{stem[:220]}{'…' if len(stem) > 220 else ''}“. "
                "Die Markierung stammt aus der studentischen Fragensammlung, nicht aus einem amtlichen IMPP-Schlüssel."
            )
        elif "1" in bits:
            text = (
                f"Falsch ({chr(65 + i)}): {opt}. "
                f"Im Originalprotokoll ist nicht {chr(65 + i)}, sondern {letter} markiert. "
                f"{opt} ist damit der überlieferte Distraktor dieser Aufgabe."
            )
        else:
            text = (
                f"Option {chr(65 + i)}: {opt}. "
                "Keine markierte Lösung im Originalprotokoll — kein Schlüssel ergänzt."
            )
        term = opt if opt not in ("?", "") else topic
        rationales.append(
            {"index": i, "correct": correct_flag, "text": text[:900], "links": links(term)}
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
            "generatedAt": now,
            "confidence": conf,
        },
    }


def collect_originals(text: str) -> list[dict]:
    i1 = text.find("TAG_1 IMPP Reihenfolge")
    i2 = text.find("TAG_2 IMPP Reihenfolge")
    i3 = text.find("TAG_3 IMPP Reihenfolge")
    g1 = text.find("Tag 1 geordnet")
    g2 = text.find("Tag 2 geordnet")
    g3 = text.find("Tag 3 geordnet")
    u1 = text.find("Tag 1 ungeordnet")
    u2 = text.find("Tag 2 ungeordnet")
    u3 = text.find("Tag 3 ungeordnet")
    bodies = {1: text[g1:g2], 2: text[g2:g3], 3: text[g3:u1]}
    ungeos = {1: text[u1:u2], 2: text[u2:u3], 3: text[u3:i1]}
    index = (
        parse_index(text[i1:i2], 107, 1)
        + parse_index(text[i2:i3], 107, 2)
        + parse_index(text[i3:], 106, 3)
    )
    by_tag: dict[int, list[dict]] = {1: [], 2: [], 3: []}
    for item in index:
        by_tag[item["tag"]].append(item)
    chunks_by_tag = {
        tag: split_chunks(bodies[tag], ungeos[tag], rows) for tag, rows in by_tag.items()
    }
    # Last resort: distinctive original title in the full protocol text (still not invented).
    full_body = text[:i1] if i1 > 0 else text
    for item in index:
        if item["impp"] in chunks_by_tag[item["tag"]]:
            continue
        found = None
        for m in iter_title_matches(full_body, item["title"]):
            if heading_plausible(full_body[m.start() : m.start() + 240], item["title"]):
                found = m
                break
        if not found:
            continue
        start = found.start()
        chunk = full_body[start : start + 2200]
        chunks_by_tag[item["tag"]][item["impp"]] = (chunk, "protokoll")
    rows = []
    for item in index:
        chunk, src = chunks_by_tag[item["tag"]].get(item["impp"], ("", ""))
        options, ans = parse_options(chunk) if chunk else ([], None)
        n_real = sum(1 for o in (options or []) if o != "?")
        if ans and n_real < 2:
            ans = None
        stem = original_stem(item["title"], chunk, options, item["impp"], item["ver"])
        rows.append(
            {
                **item,
                "question": stem,
                "options": options,
                "letter": ans,
                "has_chunk": bool(chunk),
                "src": src,
                "n_real": n_real,
            }
        )
    return rows


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

    rows = collect_originals(text)
    with_opts = sum(1 for r in rows if r["n_real"] >= 2)
    with_key = sum(1 for r in rows if r.get("letter"))
    with_chunk = sum(1 for r in rows if r["has_chunk"])
    print(
        f"originals {len(rows)} chunks={with_chunk} with_options={with_opts} "
        f"marked_key={with_key} letters={Counter(r.get('letter') or '-' for r in rows)}"
    )
    empty_titles = [r["impp"] for r in rows if not ns(r.get("title") or "")]
    if empty_titles:
        print("WARNING empty original titles:", empty_titles)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    questions = [build_question(r, i + 1, now) for i, r in enumerate(rows)]
    keyed = sum(1 for q in questions if "1" in (q.get("correctAnswers") or ""))
    exam = {
        "id": EXAM_ID,
        "title": "M2 H25 – Gedächtnisprotokoll",
        "sourceLabel": "Gedächtnisprotokoll M2 Herbst 2025",
        "description": (
            f"H25 (Herbst 2025), IMPP-Reihenfolge: {len(questions)} Originalfragen aus der "
            f"studentischen Fragensammlung, {keyed} mit im Protokoll markierter Lösung. "
            "Nur Originalstämme/-optionen; fehlende Antworten nicht erfunden, Lücken als nicht überliefert."
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
    dump = Path("/tmp/h25/originals.json")
    dump.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    print(f"Wrote {BANK} and {dump}")
    print(f"Exam {EXAM_ID}: {len(questions)} original questions, {keyed} with protocol keys")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Merge enrich-batches-*/batch-*-output.json into altfragen-bank.json."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
BANK = ROOT / 'website' / 'data' / 'altfragen-bank.json'


def links(term: str):
    q = (term or '').strip()[:100]
    return [
        {'label': 'Amboss (Login)', 'url': f'https://next.amboss.com/de/search?q={quote(q)}'},
        {'label': 'DocCheck Flexikon', 'url': f'https://flexikon.doccheck.com/de/Spezial:Suche?search={quote(q[:80])}'},
        {'label': 'Wikipedia', 'url': f'https://de.wikipedia.org/w/index.php?search={quote(q)}'},
    ]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--exam-id', required=True)
    ap.add_argument('--batch-dir', required=True, help='Directory with batch-*-output.json')
    args = ap.parse_args()

    batch_dir = Path(args.batch_dir)
    if not batch_dir.is_absolute():
        batch_dir = ROOT / batch_dir
    outputs = sorted(batch_dir.glob('batch-*-output.json'))
    if not outputs:
        print(f'No output batches in {batch_dir}', file=sys.stderr)
        return 1

    data = json.loads(BANK.read_text())
    exam = next((e for e in data['exams'] if e['id'] == args.exam_id), None)
    if not exam:
        print(f'Exam not found: {args.exam_id}', file=sys.stderr)
        return 1
    by_num = {q['number']: q for q in exam['questions']}
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    updated = []
    errors = []
    for path in outputs:
        payload = json.loads(path.read_text())
        questions = payload.get('questions') or {}
        if isinstance(questions, list):
            items = {str(q['number']): q for q in questions}
        else:
            items = questions
        for num_str, row in items.items():
            num = int(row.get('number', num_str) if isinstance(row, dict) else num_str)
            if num not in by_num:
                errors.append(f'{path.name}: missing Q{num}')
                continue
            q = by_num[num]
            bits = (q.get('correctAnswers') or '').ljust(len(q['options']), '0')
            rationales_in = row.get('rationales') or row.get('optionRationales') or []
            rats = []
            ok = True
            for r in rationales_in:
                idx = int(r['index'])
                correct = bool(r['correct'])
                if idx >= len(q['options']):
                    errors.append(f'Q{num}: bad index {idx}')
                    ok = False
                    break
                if (bits[idx] == '1') != correct:
                    errors.append(f'Q{num}: correct flag mismatch at {idx} bits={bits}')
                    ok = False
                    break
                term = r.get('term') or (r.get('searchTerms') or [q['options'][idx]])[0]
                text = (r.get('text') or '').strip()
                if not text:
                    errors.append(f'Q{num}: empty text at {idx}')
                    ok = False
                    break
                rats.append({'index': idx, 'correct': correct, 'text': text, 'links': links(str(term))})
            if not ok:
                continue
            if len(rats) != len(q['options']):
                have = {r['index'] for r in rats}
                for i, opt in enumerate(q['options']):
                    if i in have:
                        continue
                    correct = bits[i] == '1'
                    rats.append({
                        'index': i,
                        'correct': correct,
                        'text': (
                            f'Richtig ({chr(65+i)}): {opt}.'
                            if correct
                            else f'Falsch ({chr(65+i)}): {opt} — nicht die markierte Lösung.'
                        ),
                        'links': links(opt if str(opt).strip() not in ('?', '') else (row.get('topicLabel') or 'M2')),
                    })
                rats.sort(key=lambda r: r['index'])

            explanation = (row.get('explanation') or '').strip()
            if not explanation:
                errors.append(f'Q{num}: missing explanation')
                continue
            q['explanation'] = explanation
            q['optionRationales'] = rats
            q['topicLabel'] = (row.get('topicLabel') or '').strip() or None
            q['explanationMeta'] = {
                'source': 'cursor',
                'generatedAt': now,
                'confidence': row.get('confidence') or 'high',
            }
            updated.append(num)

    exam['updatedAt'] = now
    data['updatedAt'] = now
    BANK.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'updated {len(updated)} questions from {len(outputs)} batches for {args.exam_id}')
    if errors:
        print(f'{len(errors)} issues:')
        for e in errors[:50]:
            print(' -', e)
    missing = [
        q['number']
        for q in exam['questions']
        if (q.get('explanationMeta') or {}).get('source') != 'cursor'
    ]
    print('still not cursor-enriched:', len(missing))
    return 0 if len(updated) else 1


if __name__ == '__main__':
    raise SystemExit(main())

import csv
import json
import re
from pathlib import Path

csv_path = Path('public/Carleton Golf Locations List - Building location.csv')
out_path = Path('buildings.js')

rows = []
with csv_path.open('r', encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)


def build_id(code: str) -> str:
    code = code.strip().upper()
    # mapping = {
    #     'RB': 'richcraft',
    #     'HS': 'hs',
    #     'MA': 'macodrum-library',
    # }
    return code#mapping.get(code, code.lower())

entries = []
for row in rows:
    code = (row.get('Building Code') or '').strip()
    if not code:
        continue
    name = (row.get('Building Name') or '').strip()
    try:
        lat = float((row.get('lat') or '').strip())
        lng = float((row.get('lng') or '').strip())
    except (TypeError, ValueError):
        continue
    description = (row.get('description (1 secntence)') or '').strip()
    entries.append({
        'id': build_id(code),
        'name': name,
        'lat': lat,
        'lng': lng,
        'powerup': {
            'type': 'points',
            'value': 100,
            'description': 'Gives +100 Points'
        },
        'description': description
    })

content = """/**
 * Campus Buildings and Powerups Configuration
 * This list is populated from the Carleton campus building CSV data.
 * Customize the coordinates (lat, lng) to match your own university campus.
 */
const BUILDINGS = """
content += json.dumps(entries, indent=2, ensure_ascii=False)
content += """;

module.exports = BUILDINGS;
"""
out_path.write_text(content, encoding='utf-8')
print(f'wrote {len(entries)} buildings to {out_path}')

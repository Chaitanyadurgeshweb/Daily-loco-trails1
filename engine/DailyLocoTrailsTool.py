import os
import re
import shutil
import subprocess
import tempfile
import traceback
from datetime import datetime, time
from pathlib import Path

# Note: In web environment, this file preserves the original standalone Python script.
# The web platform runs this engine logic natively in the server pipeline.

SOFFICE_CANDIDATES = [
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
]

ACCESS_CODE = "c"


def clean_text(value):
    if value is None:
        return ""
    return str(value).strip()


def normalize_header(value):
    return re.sub(r"[^a-z0-9]+", "", clean_text(value).lower())


def normalize_loco(value):
    text = clean_text(value)
    if text.endswith(".0"):
        text = text[:-2]
    return text


def normalize_direction(value, short=False):
    text = clean_text(value).upper()
    if text in {"NOM", "NOMINAL"}:
        return "NOM" if short else "Nominal"
    if text in {"REV", "REVERSE"}:
        return "REV" if short else "Reverse"
    return text if short else clean_text(value)


def loco_sort_key(value):
    digits = re.sub(r"\D", "", clean_text(value))
    return int(digits) if digits else 0


def find_column(headers, options):
    normalized = [normalize_header(h) for h in headers]
    for option in options:
        for index, header in enumerate(normalized):
            if header == option or option in header:
                return index
    return None


def parse_datetime(value):
    if isinstance(value, datetime):
        return value
    text = clean_text(value)
    if not text:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%d/%m/%y %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def is_zero_start(value):
    """Detects 00:00:00 to 00:00:06 railway trial dead start artifact."""
    dt = parse_datetime(value)
    if not dt:
        return False
    return time(0, 0, 0) <= dt.time() <= time(0, 0, 6)


def compute_zero_removed(final_rows):
    removed_keys = set()
    removed_examples = {}
    for row in final_rows:
        if is_zero_start(row["from"]):
            key = (row["loco"], row["direction_short"])
            removed_keys.add(key)
            removed_examples.setdefault(key, row)
    return removed_keys, removed_examples


def get_grouped_trip_data(detail_rows):
    """Groups trips by (date, loco) to return a dict of key -> set of directions."""
    grouped = {}
    for row in detail_rows:
        date_value = clean_text(row.get("date", ""))
        loco = row["loco"]
        key = (date_value, loco)
        grouped.setdefault(key, set()).add(row["direction"])
    return grouped


if __name__ == "__main__":
    print("DailyLocoTrailsTool original engine module loaded successfully.")

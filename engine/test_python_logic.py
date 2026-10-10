import sys
from DailyLocoTrailsTool import (
    clean_text,
    normalize_header,
    normalize_loco,
    normalize_direction,
    loco_sort_key,
    find_column,
    is_zero_start,
    compute_zero_removed,
    get_grouped_trip_data
)

def run_tests():
    print("Testing Python Core Logic...")
    
    # 1. Normalization tests
    assert normalize_loco("30001.0") == "30001", "Loco .0 stripping failed"
    assert normalize_loco(" 30042 ") == "30042", "Loco trim failed"
    assert normalize_direction("NOM", short=True) == "NOM"
    assert normalize_direction("NOMINAL", short=True) == "NOM"
    assert normalize_direction("nominal", short=False) == "Nominal"
    assert normalize_direction("reverse", short=True) == "REV"
    assert loco_sort_key("WAP-7 30055") == 730055
    assert loco_sort_key("30001") == 30001
    
    # 2. Header detection
    headers = ["Sl No", "Loco ID", "Dir", "Date", "From Station", "Departure Time"]
    assert find_column(headers, ["locoid", "loco"]) == 1
    assert find_column(headers, ["direction", "dir"]) == 2

    # 3. Zero-start filter tests (Critical railway trial logic: 00:00:00 - 00:00:06)
    assert is_zero_start("2025-05-10 00:00:00") is True
    assert is_zero_start("2025-05-10 00:00:03") is True
    assert is_zero_start("2025-05-10 00:00:06") is True
    assert is_zero_start("2025-05-10 00:00:07") is False
    assert is_zero_start("2025-05-10 08:30:00") is False

    # 4. Zero-start removal calculation
    sample_rows = [
        {"loco": "30001", "direction_short": "NOM", "from": "2025-05-10 00:00:04"},
        {"loco": "30001", "direction_short": "REV", "from": "2025-05-10 12:00:00"},
        {"loco": "30002", "direction_short": "NOM", "from": "2025-05-10 14:00:00"},
    ]
    removed_keys, removed_ex = compute_zero_removed(sample_rows)
    assert ("30001", "NOM") in removed_keys
    assert ("30001", "REV") not in removed_keys
    assert ("30002", "NOM") not in removed_keys

    # 5. Grouped trip count calculation
    detail_rows = [
        {"loco": "30001", "direction": "REV", "date": "10/05/25"},
        {"loco": "30002", "direction": "NOM", "date": "10/05/25"},
        {"loco": "30002", "direction": "REV", "date": "10/05/25"},
    ]
    grouped = get_grouped_trip_data(detail_rows)
    assert len(grouped[("10/05/25", "30001")]) == 1
    assert len(grouped[("10/05/25", "30002")]) == 2

    print("ALL 5 CORE PYTHON LOGIC SUITES PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()

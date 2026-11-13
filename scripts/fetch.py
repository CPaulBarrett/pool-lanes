"""Fetch GESAC lane availability and save it as site/data.json.

The availability shown on geleisure.com.au comes from PerfectGym's booking
system, which exposes each pool's calendar as JSON. Browsers on other sites
are not allowed to read that JSON (no CORS header), so this script fetches it
on a server (GitHub Actions) and saves a trimmed-down copy next to the web page.

Uses only the Python standard library, so there is nothing to install.
Run it locally with:  python3 scripts/fetch.py
"""

import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://geleisure.perfectgym.com.au/ClientPortal2/api/Calendars/ClubZoneOccupancyCalendar/GetCalendar"
CALENDAR_PAGE = "https://geleisure.perfectgym.com.au/ClientPortal2/ClubZoneOccupancyCalendar/"
DAYS = 5

# The calendar IDs come from the links on geleisure.com.au/swim/pool-availability
POOLS = [
    {"key": "50m", "name": "50m pool", "calendar_id": "2c38d8a41"},
    {"key": "25m", "name": "25m pool", "calendar_id": "68996c012"},
]

OUTPUT = Path(__file__).resolve().parent.parent / "site" / "data.json"


def get_calendar(calendar_id: str) -> dict:
    """Download one pool's calendar for the next DAYS days."""
    query = urllib.parse.urlencode({"calendarId": calendar_id, "daysPerPage": DAYS})
    request = urllib.request.Request(
        f"{API}?{query}",
        headers={"User-Agent": "pool-lanes/1.0 (personal timetable viewer)"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def simplify(calendar: dict) -> list:
    """Turn PerfectGym's verbose format into {date, slots: {"06:00": free_lanes}}.

    A slot marked not available (pool closed, or booked out for squads or
    lessons) is stored as None, which becomes null in JSON.
    """
    days = []
    for day in calendar["dayBlocks"]:
        slots = {}
        for hour in day["hours"]:
            start = hour["fromHour"]["value"][:5]  # "06:30:00" -> "06:30"
            free = hour["totalCountOfOccupancyAvailability"]
            slots[start] = free if hour["isAvailable"] else None
        days.append({"date": day["date"], "slots": slots})
    return days


def main() -> None:
    pools = []
    for pool in POOLS:
        calendar = get_calendar(pool["calendar_id"])
        days = simplify(calendar)
        if not days:
            raise SystemExit(f"No data returned for {pool['name']}")
        lanes = max(
            (h["numberOfFacilities"] for d in calendar["dayBlocks"] for h in d["hours"]),
            default=0,
        )
        pools.append({
            "key": pool["key"],
            "name": pool["name"],
            "lanes": lanes,
            "source": CALENDAR_PAGE + pool["calendar_id"],
            "days": days,
        })
        time.sleep(1)  # be gentle with their server

    data = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "pools": pools,
    }
    OUTPUT.write_text(json.dumps(data, indent=1))
    print(f"Wrote {OUTPUT} ({len(pools)} pools, {DAYS} days)")


if __name__ == "__main__":
    main()

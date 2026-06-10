# Design QA

final result: passed

Reference: Product Design image generation option 2, "Circuit Atlas".

Prototype checked at:

- Desktop: default in-app Browser viewport, `http://127.0.0.1:5173`
- Mobile: 390 x 844 viewport

Checks:

- Desktop layout keeps the selected direction: light atlas surface, season tabs, timezone chip, route-style race calendar, sprint labels, and a right-side race detail/session panel.
- Session table displays local circuit time and device timezone time from UTC source data.
- Filters and search are functional: sprint filter, China search, and 2025 season switch were verified.
- Responsive behavior passes: mobile swaps the map for a compact race list and has no horizontal overflow.
- Data integrity passes: all 2024, 2025, and 2026 races have circuit metadata and core session records.

Notes:

- 2026 currently contains 22 races in the Jolpica/F1 schedule source used by this prototype.
- Session rows show session start times only, because official API data does not consistently provide end times for all sessions.

# Calculation provenance

34 files extracted from Code Destiny at 09544df6453584376931d695b53c5a7d27bd0143.
Original SHA-256 hashes: `docs/engine-provenance.json`. No edits to D:/Development.

Local changes after extraction:
- swiss-ephemeris.js: removed birth input/coordinates from diagnostic logging.
- vedic-ai-chart.js: timezone offset calculation ignores sub-second milliseconds (Intl parts have second precision).

No original final report generator is called. Domain adapters select calculated facts and build new persona/domain prompts.
Runtime dependencies: astronomy-engine, sweph-wasm 2.6.9. Swiss license supplied at public/ephe/SWISS-LICENSE.txt (AGPL); commercial deployment/license compatibility must be confirmed before selling this service.
Ephemeris files originate from D:/Development/code-destiny/public/ephe. The supported UI input range is 1901 through today.

KASI API route exists at worker/routes/kasi.js in the source project. We use its same local Korean calendar core without making external API calls on each purchase. Live upstream KASI comparison remains a separate verification activity.

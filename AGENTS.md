App Description

This app is a fully client-side, browser-based visual timer that allows users to:
	•	Set a custom total countdown time (in seconds).
	•	Add any number of sound triggers at exact time points during the countdown.
	•	Choose for each trigger between three default sounds (ding, beep, long beep) or upload a custom audio file.
	•	View a large, modern visual timer display that shows both remaining and elapsed time.
	•	Optionally enable a spoken 2-minute pre-dive countdown before the main timer starts.
	•	All configuration is persisted in localStorage and IndexedDB so the page survives reloads. No data leaves the device.

Implementation notes:
	•	Timer uses `Date.now()` deltas (not setInterval counter increments) so it stays accurate when the tab is backgrounded.
	•	When the timer is running it requests `navigator.wakeLock` so the screen doesn't sleep mid-dive; re-acquired on `visibilitychange`.
	•	Custom audio blobs are stored in IndexedDB (`src/idb.ts`), keyed by the trigger id. localStorage only carries the minimum metadata.

All code updates must have tests, any bug fixes must have tests.

run tests, lint before submitting

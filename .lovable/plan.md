

# Connect to Another Lovable App (Replace Google Sheets)

## Overview
Replace the Google Sheets data source with a direct connection to your other Lovable booking/CRM app. This app will pull new appointments from the other app's database via a backend function.

## How It Works

The other Lovable app (your booking/CRM) will need to expose its appointment data through a backend API endpoint. This app will call that endpoint to fetch new appointments instead of reading from Google Sheets.

```text
+---------------------+         HTTPS API call         +---------------------+
|  This App           | -----------------------------> |  Other Lovable App  |
|  (Route Management) |   "Give me new appointments"   |  (Booking / CRM)    |
|                     | <----------------------------- |                     |
|  Stores in its own  |     Returns appointment data   |  Has appointment    |
|  database           |                                |  data               |
+---------------------+                                +---------------------+
```

## Steps Required

### Step 1: Set up an API in the OTHER Lovable app
In your booking/CRM Lovable project, create a backend function (edge function) that returns appointment data. It should accept a query parameter like `?since=2026-02-13` so this app can fetch only new records.

The endpoint will return JSON with fields matching your appointment structure (Sr No, Customer Name, Pet Type, Location, Lat, Long, etc.).

### Step 2: Store the other app's URL as a secret
Save the other app's API URL as a secret in this project so the backend function can call it securely.

### Step 3: Create a backend function in THIS app
Build an edge function called `fetch-remote-appointments` that:
- Calls the other app's API endpoint
- Receives appointment data as JSON
- Returns it to the frontend

### Step 4: Replace the Google Sheets refresh logic
- Replace `googleSheetsParser.ts` usage with a new `remoteAppParser.ts` that calls our edge function
- Update the "Refresh" button in `Index.tsx` to say "Sync from Booking App" instead of "Refresh from Google Sheets"
- Keep the same smart deduplication logic (skip appointments with existing Sr No)

### Step 5: Clean up
- Remove `googleSheetsParser.ts` (no longer needed)
- Remove Google Sheets references from the UI (header, Doctors tab info card)

## What You Need to Provide
1. **The other Lovable app's project URL** (or published URL) so we can set up the connection
2. **The data format** from the other app -- what columns/fields does it store for appointments?

## Technical Details

**Edge function in the OTHER app** (`get-appointments/index.ts`):
- Queries its own `appointments` (or `leads`/`bookings`) table
- Filters by date if `?since=` param provided
- Returns JSON array

**Edge function in THIS app** (`fetch-remote-appointments/index.ts`):
- Reads the remote API URL from secrets
- Calls the other app's endpoint
- Returns the data to the frontend

**Frontend changes:**
- New `src/utils/remoteAppParser.ts` replaces `googleSheetsParser.ts`
- `Index.tsx`: Update button text and `handleRefreshData` to call the new parser
- Remove Google Sheets info card from Doctors tab

## Before We Start
Please share:
1. The URL of your other Lovable app
2. What table/data structure it uses for appointments or bookings


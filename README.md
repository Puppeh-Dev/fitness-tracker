# Fitness

A free iPhone app for planning workouts and tracking weight. It's a web app you
add to your home screen, so there's no App Store, no Mac and no subscription.
Weight and workouts from Apple Health come in through an Apple Shortcut.

All data stays on your phone. There's no server and no account.

## What it does

- **Today**: this week's plan at a glance (green = done, red = missed),
  today's workout, and a quick weigh-in box.
- **Plan**: pick from about 20 ready-made workouts (**Find a workout**),
  filtered by the equipment you own and whether you're training indoors or
  outdoors, or build your own (sets, reps, rest and load). Then assign them to
  days of the week.
- **Indoor/outdoor swaps**: if today's planned workout is indoors and you'd
  rather be outside (or the other way round), Today suggests a matching
  workout for the same body area and lets you swap it for the day.
- **Weight**: weigh-ins, a chart with a 7-day average, change over 30 days,
  and distance from your goal. The average matters more than any single day,
  since body weight swings 1–2 kg on water alone.
- **Log**: record a workout (from your plan or anything else) with notes.
- **More**: your equipment and indoor/outdoor preference, import from Apple
  Health, units (kg/lb), goal weight, backup and restore.

## Install on your iPhone

1. Open the app's web address in **Safari** (not Chrome).
2. Tap the **Share** button (square with an arrow).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. From now on, open it from the home screen icon. Safari and the home screen
   app keep **separate** data, so stick to the icon.

## Set up the Apple Health Shortcut

The app can't read Apple Health directly (only App Store apps can). Instead, a
Shortcut reads Health, copies the data, and you paste it into the app with one
tap. Build it once in the **Shortcuts** app:

1. Open **Shortcuts**, tap **+**, and name it **Send to Fitness**.
2. **Weight:**
   1. Add **Find Health Samples**. Set *Type* to **Weight**, add a filter
      *Start Date is in the last 30 days*.
   2. Add **Repeat with Each** (it picks up the Health Samples).
   3. Inside the repeat, add **Format Date**. Tap the date field and choose
      *Repeat Item → Start Date*. Set *Date Format* to **ISO 8601** and turn
      **Include Time** on.
   4. Still inside, add **Text** and type exactly:
      `W|` *Formatted Date* `|` *Repeat Item → Value* ` ` *Repeat Item → Unit*
      (the *italic* parts are variables you insert by tapping; `|` is the
      vertical bar on the symbols keyboard).
   5. After **End Repeat**, add **Combine Text**, choose *Repeat Results*, and
      set the separator to **New Lines**.
3. **Workouts:** repeat step 2 with these changes:
   - In **Find Health Samples** set *Type* to **Workouts** (on some iOS
     versions this is a separate **Find Workouts** action).
   - Make the Text line:
     `X|` *Formatted Date* `|` *Repeat Item → Type* `|` *Repeat Item → Duration* `|` *Repeat Item → Energy*
     (leave off the last `|` and Energy if your iOS version doesn't offer it).
4. Add a **Text** action containing the weight *Combined Text*, a new line,
   then the workout *Combined Text*.
5. Add **Copy to Clipboard** (it picks up the Text).
6. Optional: add **Show Notification** saying "Copied. Open Fitness and tap
   Paste from Shortcut."

**To sync:** run the Shortcut, open Fitness, go to **More**, tap
**Paste from Shortcut**, and tap iOS's **Paste** bubble if it appears.
Running it twice is safe: anything already imported is skipped.

**Automate the first half:** in Shortcuts → **Automation** → **+** →
**Time of Day**, pick e.g. 8:00 daily, choose **Run Immediately**, and select
Send to Fitness. You still need to open the app and tap Paste; iOS doesn't let
a Shortcut write into a home screen web app directly.

If an import says lines were skipped, use **Paste manually instead** on the
More tab to see what the Shortcut produced. Each line should look like:

```
W|2026-10-20T07:10:00+01:00|82.4 kg
X|2026-10-19T18:00:00+01:00|Running|32 min|280 kcal
```

The importer copes with comma decimals, lb/stone, and durations like
`32 min`, `1 hr 5 min`, `32:30` or raw seconds.

## Back up your data

Data lives only on the phone. Deleting the home screen icon deletes the data.
Use **More → Save backup file** every couple of weeks and keep the file in
Files or iCloud Drive; **Restore from backup** brings it back. The Today screen
reminds you when a backup is more than two weeks old.

## Hosting

`.github/workflows/pages.yml` runs the tests and deploys to GitHub Pages on
every push to `main`. One-time setup: repo **Settings → Pages → Source:
GitHub Actions**. GitHub Pages is free for public repos; private repos need
GitHub Pro. Netlify and Cloudflare Pages also host it free from a private repo
(no build step; publish the repo root).

## Develop

No build step and no dependencies. Plain HTML, CSS and JavaScript modules.

```
npm start   # serves on http://localhost:8080
npm test    # unit tests for the Health parser and weight stats
```

When you change any app file, bump `VERSION` in `sw.js` so phones pick up the
new version instead of the cached one.

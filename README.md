# Elizade Connect — Mobile App

The customer app for **Elizade Motors**, Nigeria's Toyota / Jetour / JAC
dealership group. Not a marketplace: it is the app an Elizade *customer* uses
after (and around) buying a car — browse the showroom, book a test drive,
service the vehicle, track a warranty claim, and talk to support.

React Native + **Expo SDK 54**, TypeScript throughout, runs in Expo Go.

---

## Run it

```bash
npm install
npx expo start
```

Scan the QR with Expo Go (Android: in-app scanner; iOS: Camera). Phone and
computer must be on the same Wi-Fi. On a locked-down network use
`npx expo start --tunnel`.

### Pointing at the backend

`.env` holds two keys:

```
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8000/api/v1
EXPO_PUBLIC_USE_MOCK=false
```

Use the machine's **LAN IP**, not `127.0.0.1` — a physical phone resolves
localhost to itself. (Android emulator: `http://10.0.2.2:8000/api/v1`.)

> `EXPO_PUBLIC_*` values are inlined at **bundle** time, so editing `.env` does
> nothing until you restart with a cleared cache:
>
> ```bash
> npx expo start -c
> ```
>
> This is the single most common cause of "the app can't reach the API" after a
> DHCP lease change. Backend setup lives in [`../README.md`](../README.md).

Set `EXPO_PUBLIC_USE_MOCK=true` to run entirely on bundled demo content, no
backend required — useful for UI work and offline demos.

---

## Checks

```bash
npm run verify      # typecheck + theme guard
npm run typecheck   # tsc --noEmit
npm run check:theme # hardcoded-colour guard (see Theming)
```

There is no JS test runner. Correctness rests on TypeScript, the theme guard,
and the backend's own suite — worth knowing before you rely on a refactor.

---

## Screens

Six tabs (`app/(tabs)/`):

| Tab | What it does |
|---|---|
| **Home** | Dashboard — primary vehicle, next service, quick actions, notifications |
| **Shop** | Showroom: live inventory, category filter, vehicle comparison |
| **Service** | Book and track service appointments |
| **Support** | Support tickets with threaded replies and attachments |
| **Bookings** | Test drives — upcoming and past |
| **Profile** | Account, theme mode, garage, warranty |

Plus stack routes: `car/[id]`, `compare`, `book-test-drive`, `book-service`,
`service-detail/[id]`, `garage`, `garage-vehicle/[id]`, `warranty`,
`new-ticket`, `ticket/[id]`, `trade-in`, `notifications`, `onboarding`, and
`(auth)/` (login · register · otp).

Auth is **email OTP** — no passwords. Registration is a four-step wizard
(name → email → phone → verify) with auto-verify once six digits are entered.

---

## Architecture

```
app/                     expo-router routes — one file per screen
  _layout.tsx            fonts, providers, wallpaper, compare tray, native bars
src/
  api/                   HTTP clients + DTOs (wire format)
    mappers.ts           DTO → domain. The ONLY place wire shapes are known
  data/                  repositories — swap live API vs mock behind one call
  domain/                domain models + pure logic (types.ts, compare.ts)
  hooks/                 data-loading hooks (loading/error/reload)
  components/            shared UI
  theme/                 colours, spacing, typography, shadows, useTheme
  store/useStore.ts      zustand, persisted via AsyncStorage
scripts/check-theme.js   CI guard against hardcoded colours
```

**The mapper layer is deliberate.** Screens never see DTOs. When the backend
renames a field, `src/api/mappers.ts` changes and nothing else does.

**Repositories hide the mock switch.** Every screen calls
`fetchVehicles()`, not `supportApi.list()`, so `EXPO_PUBLIC_USE_MOCK` is
honoured in one place per domain rather than at every call site.

### State

Zustand with `persist`. Only non-sensitive preferences are persisted —
`partialize` deliberately excludes `currentUser`, which holds PII, because
AsyncStorage is unencrypted. The JWT lives in **expo-secure-store**
(Keychain / KeyStore) and the profile is re-fetched from `/auth/me` on launch.

---

## Theming

Light, Dark, and System, switchable in Profile. `useTheme()` resolves the
palette; `app.json` sets `userInterfaceStyle: "automatic"`, which is what makes
System mode actually track the OS.

Brand is **black + yellow**. Accent `#F5B301` is constant across themes.

### Rules that matter

**Never hardcode a colour in a screen or component.** Use `t.colors.*`.
`npm run check:theme` fails the build otherwise. A stray hex is invisible to
`tsc` and produces unreadable UI in whichever theme it wasn't written for.

Some colours are legitimately theme-*independent* and live as named constants
in `src/theme/colors.ts`, each documented with why:

| Token | Use |
|---|---|
| `OVERLAY_CHIP` / `OVERLAY_CHIP_INK` | Chips floating on vehicle photography — a photo is not a themed surface |
| `ON_DARK_INK` | Text on always-dark gradients (warranty certificate, hero panels) |
| `PATTERN_YELLOW` | Wallpaper stroke — a fixed brand asset |
| `accentText` | Accent-toned *inline text*. Brand gold is 1.85:1 on white; this deepens to bronze in light mode |
| `successText` / `warningText` / `errorText` / `infoText` | Status colours as **type**. The base `success` etc. are tuned as fills and fail badly as text |

`canvas` is the recessed page backdrop. It is **not** `surfaceAlt`: in dark mode
`surfaceAlt` is *lighter* than `surface`, so using it as the page background
inverts elevation and makes every card look sunken.

All text/surface pairs are verified against WCAG AA (4.5:1) in both themes.

### Wallpaper

An automotive doodle pattern (`PatternBackground`) is mounted **once** in
`app/_layout.tsx` beneath the navigator. Screens render
`backgroundColor: 'transparent'` so it shows through; cards and sheets are
opaque, so body text never sits on it. Seamless SVG `<Pattern>` tiling — one
native view at any screen size, crisp at every density.

Modals are `transparent`, so the root pattern already shows through their
scrims. Do **not** add a second pattern layer inside a modal — two tilings at
different phases read as noise.

Third-party marques (Toyota, Jetour, JAC) are deliberately **not** drawn.
`BRAND_MARK_PLACEMENTS` in `PatternBackground.tsx` is an empty slot ready for
official path data once brand approval is in hand.

---

## Notable features

**Vehicle comparison** — stage two cars from any showroom card or the detail
screen; a floating tray tracks the selection across navigation. `compare.tsx`
renders sticky column headers over a grouped spec matrix with a
differences-only filter. `src/domain/compare.ts` is pure and separately tested.

> It ignores `Vehicle.seats` and `Vehicle.horsepower` on purpose. Those are
> synthesised per-category by the mapper, so every SUV reports the same numbers.
> Real specs come from the backend `specs` bag. Never surface derived values in
> a comparison — that is the one screen where a buyer reads numbers to decide.

**Support attachments** — photos or PDFs on a new ticket or any reply, up to
five. Files upload at pick time (not at send), so a slow photo can't stall the
submit and failures surface while the user can still react.

**Onboarding, notifications, garage, warranty claims, trade-in valuation,
test-drive booking** — all wired to live endpoints.

---

## Not done

- **No release build pipeline.** No Android SDK on the current machine and no
  `eas.json`. Verified via typecheck + `expo export`; there is no installable
  APK yet. Needs an EAS account or a local SDK.
- **No structured device QA pass.**
- **No front-end tests** (see Checks).
- **No crash reporting** — `ErrorBoundary` catches crashes but the
  Sentry/Crashlytics hook is still a TODO, so production crashes are invisible.
- **Dead controls**: share on car detail, "Add photos" on trade-in, and the
  Showroom search bar (a `<Txt>`, not an input — `FilterSheet` exists and is
  wired to Home, not Shop).

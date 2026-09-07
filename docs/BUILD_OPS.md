# Getting a build out the door

This app moved from **no release pipeline at all** to working local and
EAS-cloud iOS builds, plus first Android credentials, in one pass. If you're
picking this up next, everything you need — what changed, why, and the exact
commands — is below.

A designed, browsable version of this doc: https://claude.ai/code/artifact/29e3804e-048f-4112-a451-c0bf48265df7

---

## 1. Current state

| | | |
|---|---|---|
| **Bundle / package ID** | `com.mobile.elizade` (iOS + Android, matches App Store Connect & Play) | confirmed |
| **EAS project** | `@elizade/elizade` — `59cc49df-60a6-…` | accessible |
| **iOS signing** | Apple Distribution · Meristem Securities Ltd (`7JRPV5Z37M`) | working |
| **iOS build number** | `2` on EAS's remote counter — ASC already holds build 1 | set |
| **Android keystore** | Generated via EAS, backed up locally | back up off-device |
| **eas submit (iOS)** | Configured — App Store Connect API key, no Apple ID/2FA needed | ready |

---

## 2. What changed

1. **Bundle identifier corrected** from `com.elizade.app` to `com.mobile.elizade`
   on both platforms — the placeholder from initial scaffolding didn't match
   the App ID actually registered on Meristem's Apple Developer and Google
   Play accounts.

2. **EAS project ownership resolved.** `app.json`'s `owner` field pointed at
   a personal account (`b1gj0hn`) that no longer matched who had access. It's
   now `elizade` — the org this project actually lives under.

3. **iOS signing set up from scratch.** No Distribution certificate existed
   on this machine or on the Apple Developer Portal for this bundle ID — only
   Development certs. One was generated via Xcode (Signing & Capabilities →
   Meristem Securities Limited team), and the first Distribute-App pass
   through Xcode's Organizer created the matching Distribution provisioning
   profile on the portal.

4. **App Store Connect API key wired into `eas.json`** under
   `submit.production.ios`, so `eas submit` authenticates without ever
   touching Apple ID login or SMS 2FA — which was failing intermittently for
   this account.

5. **Android credentials generated for the first time** via `eas
   credentials`, and version code aligned to `2` to match iOS's build number.

6. **`justfile` added** for the commands you'll run repeatedly — typecheck,
   prebuild, build, submit, version bump.

---

## 3. First-time setup

- Xcode (current stable) with Command Line Tools, plus CocoaPods — only if
  you intend to build locally, not for EAS cloud builds.
- `eas-cli` installed globally, logged in as an account with access to
  **@elizade/elizade** — check with `eas whoami`.
- Your Apple ID added to the **Meristem Securities Limited** Apple Developer
  Team if you'll ever need to touch signing interactively (Xcode Organizer,
  `eas credentials` in Apple-ID mode). Ask an existing Admin to invite you.
- `just` installed (`brew install just`) — optional, but every command below
  has a shorter recipe in the `justfile`.

> **Note:** The `ios/` folder is **not** committed to git — it's regenerated
> from `app.json` on demand. Run `just prebuild-ios` (or `npx expo prebuild
> --platform ios`) before opening Xcode on a fresh checkout.

---

## 4. Building a release

Typecheck is a hard gate — every path below runs it first.

### Cloud build (recommended)

Compiles on EAS's servers. No Xcode required locally.

```bash
just build-ios-cloud

# or, without just:
npm run typecheck && eas build --platform ios --profile production
```

### Local build

Compiles on your Mac — useful when you want to iterate on native config
without waiting in EAS's queue.

```bash
just build-ios-local
```

> **Must run in a real terminal, not piped output.** The first time a
> Distribution Certificate is used for a build, EAS asks an interactive
> yes/no to validate it. Run these commands directly in your own terminal
> session — not through a script that captures stdout — or they'll fail with
> *"Distribution Certificate is not validated for non-interactive builds."*

---

## 5. Submitting

Pushes the most recent EAS build straight to App Store Connect / TestFlight.

```bash
just submit-ios

# or:
eas submit --platform ios --profile production --latest
```

This uses the App Store Connect API key configured in `eas.json` — no Apple
ID prompt, no 2FA. If you'd rather do it by hand: download the `.ipa` from
the build's page on [expo.dev](https://expo.dev) and drag it into
**Transporter** instead. Same destination, either path.

---

## 6. Version numbers

`eas.json` sets `appVersionSource: "remote"` — EAS tracks build numbers on
its own servers, not in `app.json` or the native project.

| Field | Where it lives | Current value |
|---|---|---|
| Marketing version (`1.0.0`-style) | `app.json → expo.version` | `1.0.0` |
| iOS build number | EAS remote counter | `2` |
| Android version code | EAS remote counter | `2` |

> App Store Connect already had a build stamped `1` before this pipeline
> existed (from an earlier manual Xcode upload). That's why EAS's counter had
> to be bumped to `2` by hand — Apple rejects re-uploading a build number
> that's already attached to a version string. Check `eas build:version:get
> --platform ios` against what's actually live in App Store Connect before
> your first build each time this drifts.

```bash
# bump the counter — prompts for the number, must run in a real terminal
just version-set-ios
```

---

## 7. Credentials

| | |
|---|---|
| **iOS Distribution Cert** | Stored remotely by EAS (and in this Mac's Keychain). Reusable — don't regenerate unless it's revoked or expired. |
| **ASC API Key** | `credentials/AuthKey_7QY994T622.p8` — git-ignored. Key ID `7QY994T622`, used for `eas submit` only, not build signing. |
| **Android keystore** | Generated by EAS, mirrored to `credentials/android/` (git-ignored) plus a local backup outside the repo. **Irreplaceable** — see gotchas. |
| **Getting the .p8 / keystore** | Ask whoever ran this setup, or regenerate via `eas credentials --platform ios` / `--platform android` if starting fresh — but prefer reusing existing ones over generating new ones. |

> Nothing under `credentials/`, and no `.p8`/`.p12`/`.jks` file, should ever
> be committed. `.gitignore` already blocks these — don't override it with
> `git add -f`.

---

## 8. Known gotchas

- **Automatic signing can silently pick Development over Distribution.** If
  a local archive comes out signed `Apple Development` instead of `Apple
  Distribution`, check Xcode → Signing & Capabilities → Release row
  specifically; Debug and Release can resolve differently even under
  "Automatic."
- **Apple ID SMS 2FA can fail server-side** ("Verification codes can't be
  sent to this phone number at this time"). If it happens: retry, use a
  trusted-device push instead of SMS, or switch entirely to the ASC API key
  path — set `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`,
  `EXPO_ASC_ISSUER_ID`, and `EXPO_APPLE_TEAM_ID` as environment variables
  before running `eas credentials` — it skips Apple ID login for
  certificate/profile operations entirely.
- **Lose the Android keystore, lose the ability to update the app.** Google
  Play requires the same signing key for every future release of a given
  package with no recovery path. Keep the backup somewhere durable outside
  this machine — a password manager or encrypted cloud storage, not just
  `~/Downloads`.
- **An org invite isn't always project access.** Being added to the
  `elizade` Expo org doesn't automatically grant access to a specific
  project owned by a different account — confirm with `eas project:info`,
  not just `eas whoami`.

---

Questions on anything here — ping whoever set up this pipeline, or check the
[EAS Build docs](https://docs.expo.dev/build/introduction/) for anything
EAS-specific.

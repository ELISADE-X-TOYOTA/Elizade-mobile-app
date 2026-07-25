# Elizade — Car Marketplace & Rental (React Native · Expo)

A premium, cross-platform automotive marketplace & rental app. Luxury
fintech-inspired UI — deep-teal + lime-green palette, soft shadows, 16px radii,
full dark mode, smooth animations. React Native port of the Flutter version,
built with **Expo Router + TypeScript** so it runs in **Expo Go via QR code**.

## Run it on your phone (Expo Go)

1. Install **Expo Go** on your device (Play Store / App Store).
2. On your computer:
   ```bash
   cd mobile-expo
   npm install
   npx expo start
   ```
3. A QR code appears in the terminal. **Scan it** — Android: from inside Expo Go;
   iOS: with the Camera app. Your phone and computer must be on the **same Wi-Fi**.
   - On a locked-down network, run `npx expo start --tunnel` instead.

Point it at the real backend (optional):

```bash
EXPO_PUBLIC_USE_MOCK=false EXPO_PUBLIC_API_URL=https://your-host/api/v1 npx expo start
```

> **Expo Go version note:** these deps target **Expo SDK 52**. If your Expo Go is a
> different SDK, run `npx expo install expo@latest && npx expo install --fix` to
> realign, or install the matching Expo Go build.

## Tech

- **Expo Router** (file-based navigation, `app/`)
- **Zustand** for state (theme mode, favorites, filters) — persisted via AsyncStorage
- **react-native-reanimated** for animations
- **expo-linear-gradient**, **@expo/vector-icons**, Google Fonts (Plus Jakarta Sans + Inter)
- TypeScript throughout; domain models mirror the Elizade web API

## Structure

```
mobile-expo/
├─ app/                        # expo-router routes (file = screen)
│  ├─ _layout.tsx              #   fonts + providers + root stack
│  ├─ index.tsx                #   animated splash (logo + car silhouette)
│  ├─ onboarding.tsx           #   3-screen paged onboarding
│  ├─ (auth)/                  #   login · register · forgot-password · otp
│  ├─ (tabs)/                  #   floating 5-tab shell + Home/Market/Bookings/Chats/Profile
│  └─ car/[id].tsx             #   car details (carousel, specs, features, booking bar)
└─ src/
   ├─ theme/                   # colors, spacing, typography, shadows, useTheme (light+dark)
   ├─ components/              # Txt, PrimaryButton, CarCard, AppTextField, AuthScaffold,
   │                          #   NetworkCarImage, SectionHeader, Skeleton, BookingModal
   ├─ domain/types.ts          # Vehicle, Booking, UserProfile + helpers
   ├─ data/mock.ts             # bundled demo content
   ├─ store/useStore.ts        # zustand store (persisted)
   ├─ constants/app.ts         # app config / feature flags / API base URL
   └─ utils/format.ts          # price / date / greeting formatters
```

## Implemented

Splash → onboarding → auth → 5-tab shell (Home, Marketplace, Bookings, Messages,
Profile) → Car Details → multi-step Booking modal with animated success. Full
design system, reusable components, light/dark theming, hero-style transitions.

## Roadmap

Firebase auth + Firestore, Stripe/Paystack checkout, Google Maps pickup/drop-off,
real-time chat, sell-your-car, wallet, notifications, comparison, and the premium
extras (AR preview, AI/voice search, live tracking, financing calculator).

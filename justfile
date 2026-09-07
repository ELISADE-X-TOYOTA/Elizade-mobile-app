# Elizade mobile app — recurring build commands
# Run `just` to list all recipes.

default:
    @just --list

# Type-check the whole project (tsc --noEmit)
typecheck:
    npm run typecheck

# Regenerate the native ios/ project from app.json (and install pods)
prebuild-ios:
    npx expo prebuild --platform ios

# Open the generated Xcode workspace
open-ios:
    open ios/*.xcworkspace

# Build a local iOS IPA via EAS (uses eas.json build profiles, runs on this machine)
# profile: development | preview | production (default: production)
build-ios-local profile="production":
    just typecheck
    eas build --platform ios --profile {{profile}} --local

# Build iOS on EAS's cloud servers instead of locally
# profile: development | preview | production (default: production)
build-ios-cloud profile="production":
    just typecheck
    eas build --platform ios --profile {{profile}}

# Show the current remote iOS build number tracked by EAS
version-get-ios:
    eas build:version:get --platform ios

# Set the remote iOS build number tracked by EAS (interactive — will prompt for the number)
# Run this whenever App Store Connect already has the build number EAS is about to reuse.
version-set-ios:
    eas build:version:set --platform ios

# Submit the latest EAS iOS build to App Store Connect / TestFlight
# Uses the ASC API key configured in eas.json (submit.production.ios) — no Apple ID/2FA needed.
submit-ios:
    eas submit --platform ios --profile production --latest

# Check who's logged into the EAS CLI
whoami:
    eas whoami

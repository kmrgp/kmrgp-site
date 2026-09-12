# KMRGP Mobile App — Setup Guide

## Overview

React Native / Expo application for **Kshatriya Mewada Rajput Parivar**.  
Connects to the existing Next.js backend at `kmrgp.com` via `/api/v1/*` REST endpoints.  
**One backend, one database, two clients.**

```
Next.js Website  +  React Native App
        |
   /api/v1/* REST
        |
   Service Layer
        |
  Neon PostgreSQL  +  Cloudflare R2
```

---

## Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android emulator) or physical Android device

---

## Installation

```bash
cd mobile
npm install
```

---

## Environment Configuration

### Development (local Next.js server)

Edit `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:4024/api/v1
```

Replace `<YOUR_LAN_IP>` with your machine's local network IP (e.g. `192.168.1.10`).  
Find it with `ipconfig` (Windows) or `ifconfig` (Mac/Linux).

**Important:** Use your LAN IP, not `localhost`, when testing on a physical device.  
`localhost` on a phone refers to the phone itself, not your computer.

### Production

`mobile/.env.production` is pre-configured:

```env
EXPO_PUBLIC_API_URL=https://kmrgp.com/api/v1
```

---

## Running the App

```bash
# Start Expo dev server
npm start

# Open on Android emulator
npm run android

# Open on iOS simulator (Mac only)
npm run ios
```

---

## Project Structure

```
mobile/
├── app/                      # Expo Router screens
│   ├── _layout.tsx           # Root layout (auth init, status bar)
│   ├── index.tsx             # Redirect to /login or /(tabs)/home
│   ├── login.tsx             # Login screen
│   ├── register.tsx          # Registration + QR payment (2-step)
│   ├── registration-success.tsx  # Post-registration confirmation
│   ├── payment-status.tsx    # Payment status + re-upload
│   └── (tabs)/
│       ├── _layout.tsx       # Tab bar (Home, Browse, Interests, Profile)
│       ├── home.tsx          # Dashboard — stats, profile status, actions
│       ├── browse.tsx        # Profile search with filters + detail modal
│       ├── interests.tsx     # Received / sent / accepted interests
│       └── profile.tsx       # Edit bio-data, upload photo, submit for approval
│
├── src/
│   ├── api/
│   │   ├── client.ts         # Base API client — Bearer token, SecureStore, error handling
│   │   ├── auth.ts           # login, logout, register, payment order, complete registration
│   │   ├── profile.ts        # profile CRUD, photo upload, search, payment screenshot
│   │   ├── interests.ts      # interest send/respond/list
│   │   └── contact.ts        # contact request, status, admin phone
│   ├── store/
│   │   └── authStore.ts      # Auth state (module-level + useAuth hook)
│   ├── types/
│   │   └── index.ts          # Shared TypeScript types (mirrors web app)
│   └── constants/
│       └── theme.ts          # Brand colors, spacing, typography
│
├── .env                      # Dev API URL
├── .env.production           # Prod API URL
├── app.json                  # Expo config
├── tsconfig.json             # TypeScript config
└── package.json
```

---

## Authentication

The mobile app uses **Bearer JWT tokens** stored in `expo-secure-store` (Keychain/Keystore).

- Token is minted by the server on login/registration — same JWT algorithm as the website cookie
- Sent as `Authorization: Bearer <token>` on every authenticated request
- On app startup, `initAuth()` verifies the stored token against the server and refreshes user state
- On logout, token is deleted from SecureStore

The JWT **never expires in different ways** between web and mobile — same 7-day expiry, same secret.

---

## Registration Flow

### Free Plan
1. Fill registration form → `POST /api/v1/auth/register`
2. Account created → auto-login → home screen

### Paid Plan (QR payment)
1. Fill registration form → `POST /api/v1/payment/order` → get `orderRef`
2. QR screen shown → user pays via UPI
3. User picks payment screenshot → `POST /api/payment/screenshot` (pre-auth endpoint)
4. `POST /api/v1/payment/complete` → account created → auto-login → success screen
5. Admin reviews screenshot → approves profile → user becomes visible

---

## Payment Screenshot Upload

The screenshot is uploaded to the existing `/api/payment/screenshot` endpoint (not under `/api/v1/`).  
This endpoint does **not** require authentication because the user doesn't have an account yet.  
Authentication is the `orderRef` token tied to the registration session.

---

## Building for Android

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

---

## TypeScript Check

```bash
cd mobile
npm run typecheck
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Yes | Base URL for `/api/v1/*` endpoints |

**Never put secrets in Expo public env vars.** The mobile app contains zero server secrets,
database credentials, or R2 keys.

---

## Screens

| Screen | Route | Auth |
|---|---|---|
| Login | `/login` | Public |
| Register | `/register` | Public |
| QR Payment | `/register` (step 2) | Public |
| Registration Success | `/registration-success` | Public |
| Home (Dashboard) | `/(tabs)/home` | Required |
| Browse Profiles | `/(tabs)/browse` | Required |
| Interests | `/(tabs)/interests` | Required |
| My Profile | `/(tabs)/profile` | Required |
| Payment Status | `/payment-status` | Required |

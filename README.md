# CaseSync

CaseSync is a React/Firebase case planning tool for court case managers. It helps authorized users maintain participant profiles, track phase progress, draft SMART goals, record observations, and produce printable case plan documents.

The app is currently geared toward testing with Johnson County Problem Solving Courts.

## Current Features

- Google sign-in through Firebase Authentication.
- Per-user participant records stored in Firestore.
- Participant search, creation, profile editing, and deletion.
- Five-phase milestone tracking:
  - Orientation & Stabilization
  - Active Treatment
  - Relapse Prevention
  - Community Reintegration
  - Commencement Preparation
- IRAS target domain selection for case plans.
- Case manager observations with browser speech-to-text support when available.
- Gemini-assisted note refinement and SMART goal generation.
- Built-in and user-customizable goal templates.
- Active goal editing, deletion, completion tracking, and drag-and-drop ordering.
- Printable case plan reports with participant details, target domains, active goals, observations, and signature lines.
- Printable audit/history view with filters for goals, milestones, observations, and profile changes.
- User settings for display name, job title, theme mode, color palette, and goal templates.

## Tech Stack

- React 19
- Vite 6
- TypeScript
- Firebase Auth
- Firestore
- Express production server
- Google Gemini via `@google/genai`
- Tailwind CSS 4
- Base UI/shadcn-style local components

## Data Model

Firestore currently uses three main collections:

- `users`: user profile, role, display title, and saved goal templates.
- `participants`: participant profile, case number, phase state, milestones, goals, completed goals, notes, and IRAS domains.
- `auditLog`: per-participant activity entries for profile updates, phase changes, goals, observations, and target-domain changes.

Firestore rules restrict participant and audit data to the owning authenticated case manager. User roles are initialized as `case_manager`; admin role changes are intended to happen outside the client through backend/Admin SDK workflows.

## Environment

Create `.env.local` for local development:

```sh
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"

VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_FIRESTORE_DATABASE_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
```

Firebase config also falls back to `firebase-applet-config.json`, which is used by the AI Studio-generated applet setup. Keep `GEMINI_API_KEY` server-side only.

## Run Locally

Install dependencies:

```sh
npm install
```

Start the Vite dev server:

```sh
npm run dev
```

The dev server runs on `http://localhost:3000` and includes a Vite middleware proxy for:

- `POST /api/refine-goal`
- `POST /api/refine-notes`

Both endpoints stream Gemini responses as server-sent events.

## Production

Build the frontend:

```sh
npm run build
```

Start the production Express server:

```sh
npm start
```

In production, `server.ts` serves the compiled `dist` assets and exposes the same Gemini streaming endpoints. The server uses `PORT` when provided and falls back to `3001`.

## Useful Scripts

- `npm run dev`: start Vite on port 3000.
- `npm run server`: start the Express/Gemini server directly.
- `npm run build`: create the production frontend bundle.
- `npm start`: run the production server.
- `npm run preview`: preview the built Vite app.
- `npm run lint`: run TypeScript checks with `tsc --noEmit`.
- `npm run clean`: remove `dist`.

## Firebase

The repository includes:

- `firestore.rules`: ownership-based Firestore rules.
- `firestore.indexes.json`: Firestore index configuration.
- `firebase.json`: Firestore database/rules configuration.
- `firebase-applet-config.json`: applet Firebase configuration fallback.

If Google sign-in fails with an unauthorized-domain error, add the local or deployed domain to Firebase Authentication's authorized domains.

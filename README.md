# Gambula Arcade

Gambula Arcade is a neon-styled arcade hub built with React, Vite, Tailwind CSS, Framer Motion, and Firebase.

## Features

- 9 fast-loading arcade games
- Firebase Authentication with Google and email/password
- Firestore leaderboards per game
- Global profile ranking based on best scores
- Responsive cyberpunk-inspired interface

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` and add your Firebase values:

   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_MEASUREMENT_ID=
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

## Firestore structure

Scores are stored under:

```text
games/{gameName}/scores/{scoreId}
```

Each score stores:

- `userId`
- `username`
- `score`
- `timestamp`

Profile summaries are also stored in:

```text
profiles/{userId}
```

This powers the optional global ranking and profile dashboard.

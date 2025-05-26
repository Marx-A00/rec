# Album Recommendation App

This application allows users to search for albums using the Discogs API and create recommendations by pairing albums together with a rating score.

## Features

- **Authentication**: Sign in with Google, Spotify, or email/password
- **User Registration**: Create accounts with email and password
- Search for albums using the Discogs API
- View album details including cover art, artist, release date, and genre
- Create album recommendations by selecting a basis album and a recommended album
- Rate recommendations on a scale of 1-10

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Configure your database URL, NextAuth secret, and OAuth provider credentials
4. Set up the database:
   ```
   pnpm prisma generate
   pnpm prisma db push
   ```
5. Start the development server:
   ```
   pnpm dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Authentication

The app supports multiple authentication methods:

- **Email/Password**: Create an account at `/auth/register` or sign in at `/auth/signin`
- **Google OAuth**: Sign in with your Google account
- **Spotify OAuth**: Sign in with your Spotify account

### Registration Flow

1. Visit `/auth/register` to create a new account
2. Fill in your email, password, and optional name
3. Password requirements:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter  
   - At least one number
4. After successful registration, you'll be automatically signed in

## Usage

1. Navigate to the recommendation page
2. Search for an album by title or artist
3. Select an album from the search results to set as the basis album
4. Switch to "Recommended Album" mode and search for another album
5. Select an album from the search results to set as the recommended album
6. Adjust the score using the slider
7. Click "Create Recommendation" to submit your recommendation

## Technologies Used

- Next.js
- React
- TypeScript
- Tailwind CSS
- Discogs API (via Disconnect library)

## License

MIT

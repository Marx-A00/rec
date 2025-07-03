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
   - For testing, create `.env.test` with your test database configuration
4. Set up the database:
   ```
   pnpm prisma generate
   pnpm prisma db push
   ```
5. Set up testing (optional):
   ```
   pnpm test:setup
   ```
6. Start the development server:
   ```
   pnpm dev
   ```
7. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing with a Test-Driven Development (TDD) approach.

### Test Setup

1. **Create Test Environment File**:
   Create `.env.test` in your project root with your test database configuration:
   ```env
   # Test Database (separate from production!)
   DATABASE_URL="postgresql://postgres:[YOUR-TEST-PASSWORD]@db.[YOUR-TEST-PROJECT].supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR-TEST-PASSWORD]@db.[YOUR-TEST-PROJECT].supabase.co:5432/postgres"
   
   # NextAuth.js (same as main)
   NEXTAUTH_URL=http://127.0.0.1:3000
   NEXTAUTH_SECRET="YUjO35DuswlAp7FroWlHb3atZmljPZa19TxTRBMRq+g="
   NEXTAUTH_DEBUG=true
   
   # OAuth providers (same as main)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

2. **Initialize Test Database**:
   ```bash
   pnpm test:setup
   ```
   This command will:
   - Run database migrations on your test database
   - Install Playwright browsers

### Running Tests

- **Run all tests**:
  ```bash
  pnpm test
  ```

- **Run specific test**:
  ```bash
  npx playwright test --grep "test name"
  ```

- **Run tests with UI** (interactive mode):
  ```bash
  pnpm test:ui
  ```

- **Debug tests** (step through with DevTools):
  ```bash
  pnpm test:debug
  ```

- **View test reports**:
  ```bash
  pnpm test:report
  ```

### Test Database Management

- **Apply migrations to test database**:
  ```bash
  pnpm test:migrate
  ```

- **Reset test database** (clears all data):
  ```bash
  pnpm test:reset
  ```

### Test Files

- `tests/auth.spec.ts` - Authentication flow tests (registration, login, etc.)
- `tests/login.spec.ts` - User login functionality tests
- `tests/global-setup.ts` - Test environment setup and data seeding

### Test Configuration

Tests are configured to:
- Use a separate test database to avoid affecting production data
- Create test users automatically via global setup
- Run against `http://localhost:3000` (development server)
- Generate HTML reports for test results

**⚠️ Important**: Always ensure your tests use the test database, not production!

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
- Playwright (for testing)

## License

MIT

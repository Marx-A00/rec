# Album Recommendation App

This application allows users to search for albums using the Discogs API and create recommendations by pairing albums together with a rating score.

## Features

- Search for albums using the Discogs API
- View album details including cover art, artist, release date, and genre
- Create album recommendations by selecting a basis album and a recommended album
- Rate recommendations on a scale of 1-10

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

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

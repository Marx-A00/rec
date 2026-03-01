import { redirect } from 'next/navigation';

/**
 * /game redirects to /game/play.
 * The Play tab handles all game states (home, playing, game over).
 */
export default function GamePage() {
  redirect('/game/play');
}

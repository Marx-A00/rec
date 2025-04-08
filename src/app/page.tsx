import Link from 'next/link';
import { signIn } from '@/../auth'
export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-row space-x-4">
        <form action={async () => {
          "use server"
          await signIn("google")
        }}>

          <button type="submit" className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg">
          Sign In with Google
          </button>
        </form>
        
        <button className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg">
          Button 2
        </button>
        <Link href="/recommend"
          className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg"
        >Recommend</Link>
        <button className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg">
          Button 4
        </button>
        <button className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg">
          Search
        </button>
      </div>
    </div>
  );
}

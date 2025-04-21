import Link from 'next/link';
import SignInButton from '@/components/auth/SignInButton';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth, signOut, signIn } from '@/../auth';

export default async function Home() {
  const session = await auth();
  const user = session?.user;
  
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="absolute top-4 left-4">
        <HoverCard>
          <HoverCardTrigger asChild>
            <button className="rounded-full h-8 w-8 overflow-hidden">
              <Avatar className="h-full w-full">
                {user ? (
                  <AvatarImage src={user.image || "/placeholder.svg?height=100&width=100"} alt={user.name || "User"} />
                ) : (
                  <AvatarImage src="/placeholder.svg?height=100&width=100" alt="User" />
                )}
                <AvatarFallback className="bg-zinc-800 text-zinc-200">
                  {user ? user.name?.charAt(0) || "U" : "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-64 bg-zinc-900 border-zinc-800 text-white" side="right" align="start" sideOffset={12}>
            {user ? (
              <div className="flex flex-col space-y-3">
                <div className="flex space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || "/placeholder.svg?height=100&width=100"} alt={user.name || "User"} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-200">
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-zinc-100">
                      {user.name || "Authenticated User"}
                    </h4>
                    <p className="text-xs text-zinc-300">
                      {user.email}
                    </p>
                    <div className="flex items-center pt-1">
                      <span className="text-xs text-zinc-400">
                        Signed in with Google
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-zinc-800">
                  <form action={async () => {
                    'use server';
                    await signOut();
                  }}>
                    <button 
                      type="submit"
                      className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-1.5 px-3 rounded-md"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <h4 className="text-xs font-semibold text-zinc-100 mb-3 text-center">
                  Sign in to access your account
                </h4>
                <form action={async () => {
                  'use server';
                  await signIn('google');
                }}>
                  <button
                    type="submit"
                    className="w-full text-white bg-red-500 hover:bg-red-600 text-xs font-medium py-2 px-3 rounded-md"
                  >
                    Sign in with Google
                  </button>
                </form>
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      </div>
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-row space-x-4">
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
    </div>
  );
}

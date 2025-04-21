import Link from 'next/link';
import SignInButton from '@/components/auth/SignInButton';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="absolute top-4 left-4">
        <HoverCard>
          <HoverCardTrigger asChild>
            <button className="rounded-full h-8 w-8 overflow-hidden border-2 border-white">
              <Avatar className="h-full w-full">
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="flex justify-between space-x-4">
              <Avatar>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">John Doe</h4>
                <p className="text-sm">
                  Music lover with a passion for discovering new artists and hidden gems.
                </p>
                <div className="flex items-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    Member since June 2023
                  </span>
                </div>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-row space-x-4">
          <SignInButton />
          <Link href="/profile"
          className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg"
          >My Profile</Link>
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

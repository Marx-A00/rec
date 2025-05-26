import { auth } from '@/../auth';
import { redirect } from 'next/navigation';
import Profile from './profile';


export default async function ProfilePage() {
  const session = await auth();
  const userData = session?.user;

  if (!userData) {
    redirect('/');
  }
  
  // Create a user object with auth data plus additional profile fields
  const user = {
    name: userData.name || "User",
    email: userData.email || null,
    image: userData.image || "/placeholder.svg?height=100&width=100",
    username: userData.email ? `@${userData.email.split('@')[0]}` : '@user',
    bio: "Music enthusiast | Sharing vibes and discovering new sounds",
    followers: 0,
    following: 0
  };
  
  // Pass the user data to the client component
  return <Profile user={user} />;
}



// 'use client'

// import Link from 'next/link';
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// interface User {
//   name: string
//   username: string
//   avatar: string
//   bio: string
//   followers: number
//   following: number
// }

// const user: User = {
//   name: "Jane Doe",
//   username: "@janedoe",
//   avatar: "/placeholder.svg?height=100&width=100",
//   bio: "Music enthusiast | Sharing vibes and discovering new sounds",
//   followers: 1234,
//   following: 567
// }

// export default function Profile() {

// return (
//     <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
//         <div className="max-w-4xl mx-auto">
//             <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
//                 <Avatar className="w-32 h-32">
//                     <AvatarImage src={user.avatar} alt={user.name} />
//                     <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
//                 </Avatar>
//                 <div className="text-center md:text-left">
//                     <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
//                     <p className="text-gray-400 mb-4">{user.username}</p>
//                     <p className="mb-4 max-w-md">{user.bio}</p>
//                     <div className="flex justify-center md:justify-start gap-4 text-sm">
//                         <span><strong>{user.followers}</strong> Followers</span>
//                         <span><strong>{user.following}</strong> Following</span>
//                     </div>
//                 </div>
//             </div>
//             <h2 className="text-2xl font-semibold mb-6">Collection</h2>
//         </div>
//         <Link href="/"
//         className="text-white bg-red-500 hover:bg-red-700 font-bold mb-20 py-4 px-8 rounded-full text-lg shadow-lg"
//         >home</Link>
//     </div>
// )};
export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-row space-x-4">
        <button className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg">
          My Profile
        </button>
        <button className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg">
          Button 2
        </button>
        <button className="text-white bg-red-500 hover:bg-red-700 font-bold py-4 px-8 rounded-full text-lg shadow-lg">
          Recommend
        </button>
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

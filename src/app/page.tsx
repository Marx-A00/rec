import Image from "next/image";
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col gap-4 items-center">
        <h1 className="text-2xl font-bold text-center">Test Data Display</h1>
        <div className="flex gap-4">
          <Image
            src="/image1.png"
            alt="Image 1"
            width={200}
            height={200}
          />
          <Image
            src="/image2.png"
            alt="Image 2"
            width={200}
            height={200}
          />
        </div>
        <div className="text-lg font-semibold">Score: 90</div>
      </div>
    </div>
  );
}

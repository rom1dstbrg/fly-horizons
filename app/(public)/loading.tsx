import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8">
      <Image
        src="/fly-horizons-logo-navy.svg"
        alt="Fly Horizons"
        width={180}
        height={48}
        priority
      />
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

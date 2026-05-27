import Image from "next/image";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8">
      <Image
        src="/logo-header.png"
        alt="Fly Horizons"
        width={220}
        height={60}
        style={{ width: "auto" }}
        priority
      />
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

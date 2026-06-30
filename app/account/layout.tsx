import { Header } from "@/components/layout/Header";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <div className="flex-1">{children}</div>
    </div>
  );
}

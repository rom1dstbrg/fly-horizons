import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col bg-white">{children}</div>
      <Footer />
    </div>
  );
}

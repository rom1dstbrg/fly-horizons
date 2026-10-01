// Une ligne par réglage (façon pages de réglages Nexus / Vercel) : nom et
// explication à gauche (1/3), contenu à droite (2/3), filet fin entre les lignes.
// Partagée par les onglets du profil pilote (Profil, Licence, Emails, Notifications, Compte).
export function SettingRow({ title, desc, htmlFor, children }: {
  title: string;
  desc?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2.5 py-5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
      <div>
        <label htmlFor={htmlFor} className="text-[13.5px] font-semibold text-st-text">{title}</label>
        {desc && <p className="mt-0.5 text-[12.5px] leading-snug text-st-muted">{desc}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Rond de l'expéditeur côté Fly Horizons dans les fils de messages publics
// (ticket de contact, échanges d'une réservation) : la photo du pilote, ou son
// initiale sur fond or s'il n'en a pas (demande de Romain, 27/09).
export function StaffAvatar({ photoUrl, nom }: { photoUrl?: string | null; nom: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={nom} className="h-7 w-7 rounded-full border border-border object-cover" />
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-black text-[#0b2238] shadow-gold-sm">
      {nom.trim().charAt(0).toUpperCase() || "F"}
    </div>
  );
}

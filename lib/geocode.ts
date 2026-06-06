type Waypoint = { lat: number; lng: number; nom?: string };

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      { headers: { "User-Agent": "FlyHorizons/1.0 info@fly-horizons.com" } }
    );
    const data = (await resp.json()) as { name?: string; address?: Record<string, string> };
    return (
      data.address?.city ??
      data.address?.town ??
      data.address?.municipality ??
      data.address?.village ??
      data.address?.hamlet ??
      data.name ??
      ""
    );
  } catch {
    return "";
  }
}

export async function enrichWaypointNames(waypoints: Waypoint[]): Promise<Waypoint[]> {
  return Promise.all(
    waypoints.map(async (wp, i) => {
      if (wp.nom?.trim()) return wp;
      const nom = await reverseGeocode(wp.lat, wp.lng);
      return { ...wp, nom: nom || `Point ${i + 1}` };
    })
  );
}

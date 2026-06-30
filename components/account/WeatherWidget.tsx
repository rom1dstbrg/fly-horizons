"use client";

import { useEffect, useState } from "react";
import { Wind, Droplets, Thermometer } from "lucide-react";

// EBCI – Charleroi Brussels South Airport
const LAT = 50.459;
const LON = 4.453;

// Codes WMO → affichage
const WMO: Record<number, { emoji: string; label: string; ok: boolean }> = {
  0:  { emoji: "☀️",  label: "Ensoleillé",            ok: true  },
  1:  { emoji: "🌤️", label: "Dégagé",                 ok: true  },
  2:  { emoji: "⛅",  label: "Partiellement nuageux",  ok: true  },
  3:  { emoji: "☁️",  label: "Couvert",                ok: true  },
  45: { emoji: "🌫️", label: "Brouillard",             ok: false },
  48: { emoji: "🌫️", label: "Brouillard givrant",     ok: false },
  51: { emoji: "🌦️", label: "Bruine légère",           ok: true  },
  53: { emoji: "🌦️", label: "Bruine",                  ok: false },
  55: { emoji: "🌧️", label: "Bruine forte",            ok: false },
  61: { emoji: "🌧️", label: "Pluie légère",            ok: true  },
  63: { emoji: "🌧️", label: "Pluie",                   ok: false },
  65: { emoji: "🌧️", label: "Pluie forte",             ok: false },
  71: { emoji: "❄️",  label: "Neige légère",            ok: false },
  73: { emoji: "❄️",  label: "Neige",                   ok: false },
  75: { emoji: "❄️",  label: "Neige forte",             ok: false },
  80: { emoji: "🌦️", label: "Averses",                 ok: true  },
  81: { emoji: "🌧️", label: "Averses modérées",        ok: false },
  82: { emoji: "🌧️", label: "Averses fortes",          ok: false },
  95: { emoji: "⛈️", label: "Orage",                   ok: false },
  96: { emoji: "⛈️", label: "Orage avec grêle",        ok: false },
  99: { emoji: "⛈️", label: "Orage violent",            ok: false },
};

function getWMO(code: number) {
  return WMO[code] ?? { emoji: "🌡️", label: "Données météo", ok: true };
}

interface Weather {
  temp_max: number;
  precip_prob: number;
  wind_max: number;
  code: number;
}

export function WeatherWidget({ date }: { date: string }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Open-Meteo fournit les prévisions jusqu'à ~16 jours
    const target = new Date(date + "T12:00:00Z");
    const daysAhead = (target.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysAhead < 0 || daysAhead > 16) { setLoading(false); return; }

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&daily=temperature_2m_max,precipitation_probability_max,windspeed_10m_max,weathercode` +
      `&timezone=Europe%2FBrussels&start_date=${date}&end_date=${date}`
    )
      .then((r) => r.json())
      .then((d) => {
        const daily = d?.daily;
        if (!daily) return;
        setWeather({
          temp_max:    Math.round(daily.temperature_2m_max?.[0] ?? 0),
          precip_prob: Math.round(daily.precipitation_probability_max?.[0] ?? 0),
          wind_max:    Math.round(daily.windspeed_10m_max?.[0] ?? 0),
          code:        daily.weathercode?.[0] ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 mt-2.5">
        <span className="w-3 h-3 rounded-full bg-muted-foreground/20 animate-pulse" />
        Chargement météo…
      </div>
    );
  }

  if (!weather) return null;

  const wmo = getWMO(weather.code);
  const windBad = weather.wind_max > 25;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        Météo EBCI le jour du vol
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{wmo.emoji}</span>
          <span className={`text-xs font-medium ${wmo.ok ? "text-foreground" : "text-red-600"}`}>
            {wmo.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Thermometer size={11} />
          {weather.temp_max}°C max
        </div>
        <div className={`flex items-center gap-1 text-xs ${windBad ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
          <Wind size={11} />
          {weather.wind_max} km/h
        </div>
        {weather.precip_prob > 0 && (
          <div className={`flex items-center gap-1 text-xs ${weather.precip_prob >= 50 ? "text-blue-600 font-medium" : "text-muted-foreground"}`}>
            <Droplets size={11} />
            {weather.precip_prob}% pluie
          </div>
        )}
        {(!wmo.ok || windBad) && (
          <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium">
            Conditions à surveiller
          </span>
        )}
      </div>
    </div>
  );
}

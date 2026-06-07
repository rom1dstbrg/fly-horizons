"use client";

import { useState, useMemo } from "react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import Link from "next/link";
import {
  ChevronDown, Search, MessageCircle, X,
  CalendarCheck, CreditCard, Gift, CloudRain, PlaneTakeoff, Users,
} from "lucide-react";

// ── Recherche intelligente ──────────────────────────────────────────────────

const SYNONYMS: Record<string, string[]> = {
  prix:        ["tarif", "cout", "combien", "cher", "montant"],
  tarif:       ["prix", "cout", "combien"],
  payer:       ["paiement", "provision", "acompte", "regler", "stripe", "carte", "virement"],
  paiement:    ["payer", "provision", "acompte", "stripe", "carte", "regler"],
  acompte:     ["provision", "payer", "paiement", "depot", "garantie"],
  provision:   ["payer", "paiement", "acompte", "depot", "garantie"],
  annuler:     ["annulation", "rembours", "reporter", "report", "modifier"],
  annulation:  ["annuler", "rembours", "reporter", "modifier"],
  reporter:    ["report", "modifier", "decaler", "annuler", "annulation"],
  cadeau:      ["voucher", "bon", "code", "offrir", "gift"],
  voucher:     ["cadeau", "bon", "code", "offrir"],
  bon:         ["cadeau", "voucher", "code"],
  meteo:       ["meteorologique", "pluie", "vent", "nuage", "orage", "conditions"],
  mesure:      ["personnalise", "itineraire", "route", "carte", "surmesure"],
  itineraire:  ["route", "mesure", "carte", "destination"],
  passager:    ["personne", "personnes", "participants", "invites"],
  poids:       ["masse", "kg", "kilos", "lourd"],
  age:         ["enfant", "mineur", "ans", "bebe", "jeune"],
  casque:      ["bruit", "son", "oreilles", "antibruit"],
  creneau:     ["date", "heure", "disponibilite", "calendrier"],
  secure:      ["garantie", "reserve", "bloque"],
  chaussures:  ["tenue", "vetements", "habits", "porter", "apporter", "shoes"],
  bagage:      ["sac", "valise", "apporter", "bagages", "affaires"],
  alcool:      ["boisson", "boire", "alcoolise"],
  enceinte:    ["grossesse", "bebe", "medical", "medicale", "condition", "sante", "handicap"],
  retard:      ["tarde", "tardive", "absent", "noshow", "arriver"],
  refuser:     ["refuse", "accepte", "valider", "itineraire", "mesure", "modifier"],
  altitude:    ["hauteur", "metres", "haut", "vertige", "peur", "monter"],
  assurance:   ["assure", "couvert", "sinistre", "accident", "responsabilite"],
  hobbs:       ["compteur", "temps", "reel", "minute", "calcul", "prix"],
  pays:        ["frontiere", "france", "allemagne", "paysbas", "angleterre", "etranger", "international"],
  confirme:    ["confirmation", "valide", "accepte", "delai", "combien"],
  frais:       ["supplement", "fraisup", "sup", "depas", "extra"],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[''«»]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function expandWords(words: string[]): string[] {
  const expanded = new Set(words);
  for (const w of words) {
    const direct = SYNONYMS[w] ?? [];
    direct.forEach((s) => expanded.add(s));
    for (const [key, vals] of Object.entries(SYNONYMS)) {
      if (key.startsWith(w) && w.length >= 3) {
        expanded.add(key);
        vals.forEach((v) => expanded.add(v));
      }
      if (vals.some((v) => v.startsWith(w) && w.length >= 3)) {
        expanded.add(key);
        vals.forEach((v) => expanded.add(v));
      }
    }
  }
  return [...expanded];
}

function scoreItem(q: string, aText: string, words: string[]): number {
  const nq = normalize(q);
  const na = normalize(aText);
  const qWords = nq.split(/\s+/);
  let s = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (nq.includes(w)) s += 4;
    else if (qWords.some((qw) => qw.startsWith(w) && w.length >= 3)) s += 2;
    if (na.includes(w)) s += 1;
  }
  return s;
}

// ── Données FAQ ─────────────────────────────────────────────────────────────

type FaqItem = {
  q: string;
  a: string | React.ReactNode;
  aText: string;
};

type Theme = {
  id: string;
  title: string;
  Icon: React.ElementType;
  items: FaqItem[];
};

const THEMES: Theme[] = [
  {
    id: "reservation",
    title: "Réservation",
    Icon: CalendarCheck,
    items: [
      {
        q: "Comment réserver un vol en durée fixe ?",
        aText: "Rendez-vous sur la page Nos offres, choisissez votre durée de vol : 30, 60, 90 ou 120 minutes. Cliquez sur Réserver, sélectionnez une date et un horaire dans le calendrier, renseignez vos informations, puis choisissez votre mode de paiement. La réservation est confirmée dès que la provision est reçue.",
        a: <>Rendez-vous sur la page <Link href="/nos-offres" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">Nos offres</Link>, choisissez votre durée : 30, 60, 90 ou 120 minutes. Sélectionnez une date et un horaire dans le calendrier, renseignez vos informations, puis choisissez votre mode de paiement. La réservation est confirmée dès que la provision est reçue.</>,
      },
      {
        q: "Comment fonctionne le vol sur mesure ?",
        aText: "Le vol sur mesure vous permet de dessiner votre propre itinéraire sur une carte interactive. Vous placez des points de passage : l'algorithme calcule la distance totale, la durée estimée et le prix en temps réel. Vous savez exactement ce que vous payez avant de confirmer.",
        a: <>Le vol sur mesure vous permet de tracer votre propre itinéraire sur une carte interactive. Vous placez des points de passage : l'algorithme calcule la distance, la durée estimée et le prix en temps réel. Accédez à l'outil via <Link href="/vol-sur-mesure" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">Vol sur mesure</Link>.</>,
      },
      {
        q: "D'où partent les vols ?",
        aText: "Les vols partent depuis l'aéroport de Brussels South Charleroi (EBCI/CRL). Un départ depuis un autre aéroport proche est possible sur demande, mais peut entraîner des frais supplémentaires.",
        a: "Les vols partent depuis l'aéroport de Brussels South Charleroi (EBCI/CRL). Un départ depuis un autre aéroport proche est possible sur demande, mais peut entraîner des frais supplémentaires.",
      },
      {
        q: "Puis-je réserver pour quelqu'un d'autre ?",
        aText: "Oui. Vous pouvez réserver au nom d'une autre personne, ou lui offrir un bon cadeau qu'elle utilisera elle-même pour choisir sa date. Le bon cadeau est la solution la plus flexible : le bénéficiaire réserve quand il le souhaite.",
        a: <>Oui. Vous pouvez réserver directement au nom d'une autre personne, ou lui offrir un <Link href="/nos-offres" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">bon cadeau</Link> qu'elle utilisera elle-même pour choisir sa date.</>,
      },
      {
        q: "Puis-je réserver pour une occasion spéciale ?",
        aText: "Oui. Pour un anniversaire, une demande en mariage ou toute autre occasion particulière, contactez-nous via le formulaire de contact. Nous adaptons l'expérience selon vos souhaits.",
        a: <>Oui. Pour un anniversaire, une demande en mariage ou toute autre occasion particulière, <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">contactez-nous</Link>. Nous adaptons l'expérience selon vos souhaits.</>,
      },
      {
        q: "Combien de temps à l'avance faut-il réserver ?",
        aText: "Les réservations sont possibles jusqu'à 48 heures avant le vol au minimum. En dessous de ce délai, le calendrier n'affiche plus de créneaux disponibles. Pour une demande de dernière minute, rendez-vous sur la page Contact : nous répondrons le plus rapidement possible. En période chargée (printemps, été), il est conseillé de réserver plusieurs semaines à l'avance pour avoir le choix des dates.",
        a: <>Les réservations sont possibles jusqu&apos;à 48 heures avant le vol au minimum. En dessous de ce délai, le calendrier n&apos;affiche plus de créneaux disponibles. Pour une demande de dernière minute, rendez-vous sur la <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">page Contact</Link> : nous répondrons le plus rapidement possible. En période chargée (printemps, été), il est conseillé de réserver plusieurs semaines à l&apos;avance pour avoir le choix des dates.</>,
      },
      {
        q: "Mon itinéraire vol sur mesure peut-il être refusé ou modifié ?",
        aText: "Un itinéraire peut être refusé ou adapté pour des raisons de sécurité, de météo ou de réglementation d'espace aérien (zones interdites, trafic contrôlé). Dans ce cas, le pilote propose une alternative adaptée avant le vol. Si aucune solution ne convient, la réservation est annulée et la provision remboursée intégralement. Pour les zones ou destinations importantes pour vous, signalez-les à la réservation : le pilote vérifiera la faisabilité en amont.",
        a: <>Un itinéraire peut être refusé ou adapté pour des raisons de sécurité, de météo ou de réglementation d&apos;espace aérien (zones interdites, trafic contrôlé). Dans ce cas, le pilote propose une alternative avant le vol. Si aucune solution ne convient, la réservation est annulée et la provision remboursée intégralement. Pour les destinations importantes pour vous, signalez-les à la <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">réservation</Link> : le pilote vérifiera la faisabilité en amont.</>,
      },
    ],
  },
  {
    id: "paiement",
    title: "Paiement et provision",
    Icon: CreditCard,
    items: [
      {
        q: "Comment fonctionne le paiement de la provision ?",
        aText: "Lors de la réservation, deux options s'offrent à vous. Payer maintenant : la provision est débitée immédiatement via Stripe, le créneau est sécurisé sur-le-champ. Payer plus tard : un email avec un lien de paiement Stripe vous est envoyé. Aucune saisie de carte n'est effectuée sur ce site dans ce cas.",
        a: "Lors de la réservation, deux options s'offrent à vous : payer maintenant (la provision est débitée immédiatement via Stripe, le créneau est sécurisé sur-le-champ) ou payer plus tard (un email avec un lien de paiement vous est envoyé, aucune saisie de carte sur ce site).",
      },
      {
        q: "Mon créneau est-il garanti si je choisis de payer plus tard ?",
        aText: "Non. Tant que la provision n'est pas reçue, le créneau n'est pas sécurisé. Un autre client peut réserver la même date et payer avant vous. Dès que vous réglez via le lien reçu par email, le créneau vous est attribué définitivement. Il est donc conseillé de payer le plus tôt possible.",
        a: "Non. Tant que la provision n'est pas reçue, le créneau n'est pas sécurisé. Un autre client peut réserver la même date et payer avant vous. Dès que vous réglez via le lien reçu par email, le créneau vous est attribué définitivement.",
      },
      {
        q: "Quels moyens de paiement sont acceptés ?",
        aText: "Le paiement se fait exclusivement via Stripe : carte Visa, Mastercard et American Express. Aucun virement bancaire ni paiement en espèces n'est accepté.",
        a: "Le paiement se fait exclusivement via Stripe : carte Visa, Mastercard et American Express. Aucun virement bancaire ni paiement en espèces n'est accepté.",
      },
      {
        q: "Y a-t-il des frais supplémentaires après le vol ?",
        aText: "Le prix final est calculé à partir du compteur HOBBS de l'avion (temps moteur réel). Formule : tarif horaire ÷ 60 × minutes réelles. Si le vol est plus court que la durée réservée, la différence vous est remboursée sous 24 heures. Si le vol est plus long, le supplément vous est facturé dans les mêmes délais. Aucune surprise : le tarif horaire est communiqué avant la réservation.",
        a: "Le prix final est calculé à partir du compteur HOBBS de l'avion (temps moteur réel). Formule : tarif horaire ÷ 60 × minutes réelles. Si le vol est plus court que la durée réservée, la différence vous est remboursée sous 24 heures. Si le vol est plus long, le supplément vous est facturé dans les mêmes délais. Aucune surprise : le tarif horaire est communiqué avant la réservation.",
      },
      {
        q: "Un bon cadeau peut-il couvrir la provision en totalité ?",
        aText: "Oui. Si le bon cadeau couvre la totalité de la provision, aucun paiement supplémentaire n'est demandé et le créneau est immédiatement confirmé. S'il ne couvre qu'une partie, le bénéficiaire règle le solde via Stripe.",
        a: "Oui. Si le bon cadeau couvre la totalité de la provision, aucun paiement supplémentaire n'est demandé et le créneau est immédiatement confirmé. S'il ne couvre qu'une partie, le bénéficiaire règle le solde via Stripe.",
      },
    ],
  },
  {
    id: "bons-cadeaux",
    title: "Bons cadeaux",
    Icon: Gift,
    items: [
      {
        q: "Comment acheter un bon cadeau ?",
        aText: "Rendez-vous sur Nos offres, choisissez la durée de vol souhaitée (30, 60, 90 ou 120 minutes) et payez via Stripe. Le code est envoyé par email dans les minutes qui suivent, au format XXXX-XXXX-XXXX-XXXX. Vous pouvez le transmettre par email ou l'imprimer.",
        a: <>Rendez-vous sur <Link href="/nos-offres" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">Nos offres</Link>, choisissez la durée souhaitée et payez via Stripe. Le code arrive par email dans les minutes qui suivent, au format <span className="font-mono font-bold text-foreground">XXXX-XXXX-XXXX-XXXX</span>. Vous pouvez le transmettre ou l'imprimer.</>,
      },
      {
        q: "Comment le bénéficiaire utilise-t-il le bon cadeau ?",
        aText: "Il se rend sur la page de réservation, choisit une date et un horaire, remplit ses informations, puis entre son code au moment du paiement. Le code est déduit automatiquement de la provision.",
        a: "Il se rend sur la page de réservation, choisit une date et un horaire disponibles, remplit ses informations, puis entre son code au moment du paiement. Le code est déduit automatiquement de la provision.",
      },
      {
        q: "Un bon cadeau est-il utilisable pour un vol sur mesure ?",
        aText: "Oui. Le code est valable pour n'importe quelle formule de vol, durée fixe ou itinéraire libre. Il est déduit de la provision quelle que soit la formule choisie.",
        a: "Oui. Le code est valable pour n'importe quelle formule : durée fixe ou vol sur mesure. Il est déduit de la provision quelle que soit la formule choisie.",
      },
      {
        q: "Quelle est la durée de validité d'un bon cadeau ?",
        aText: "La durée de validité est indiquée sur le bon lors de l'achat. Passé ce délai, le code ne peut plus être utilisé. En cas de doute, contactez-nous.",
        a: <>La durée de validité est indiquée sur le bon lors de l'achat. Passé ce délai, le code ne peut plus être utilisé. En cas de doute, <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">contactez-nous</Link>.</>,
      },
      {
        q: "Un bon cadeau est-il remboursable ?",
        aText: "Non. Les bons cadeaux ne sont ni remboursables ni échangeables une fois achetés. Ils sont cependant transférables librement à toute autre personne.",
        a: "Non. Les bons cadeaux ne sont ni remboursables ni échangeables une fois achetés. Ils sont cependant transférables librement à toute autre personne.",
      },
    ],
  },
  {
    id: "avant-le-vol",
    title: "Avant le vol",
    Icon: CloudRain,
    items: [
      {
        q: "Que se passe-t-il en cas de mauvaise météo ?",
        aText: "Le vol est reporté sans frais. La décision appartient au pilote et peut être prise jusqu'à 2 heures avant le départ. Vous êtes prévenu par email ou téléphone dès que possible. Un nouveau créneau est proposé selon les disponibilités.",
        a: "Le vol est reporté sans frais. La décision appartient au pilote et peut être prise jusqu'à 2 heures avant le départ. Vous êtes prévenu par email ou téléphone dès que possible. Un nouveau créneau est proposé selon les disponibilités.",
      },
      {
        q: "Puis-je annuler ou reporter mon vol ?",
        aText: "Oui. Annulation sans frais jusqu'à 48 heures avant le vol. En deçà de 48 heures, des frais de replanning pouvant aller jusqu'à 50 € peuvent s'appliquer pour couvrir les démarches administratives. En cas d'absence sans prévenir (no-show), la provision est conservée et aucun remboursement n'est effectué. Pour reporter votre vol, connectez-vous à votre espace client : un lien de report vous sera proposé.",
        a: <>Annulation sans frais jusqu'à 48 heures avant le vol. En deçà, des frais de replanning jusqu'à 50 € peuvent s'appliquer. En cas d'absence sans prévenir, la provision est conservée. Pour reporter, connectez-vous à votre <Link href="/account" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">espace client</Link> ou <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">contactez-nous</Link>.</>,
      },
      {
        q: "Combien de temps avant le vol dois-je arriver ?",
        aText: "Arrivez 15 minutes avant l'heure prévue du départ. Ce temps est nécessaire pour les vérifications d'usage, le briefing de sécurité et l'embarquement.",
        a: "Arrivez 15 minutes avant l'heure prévue du départ. Ce temps est nécessaire pour les vérifications d'usage, le briefing de sécurité et l'embarquement.",
      },
      {
        q: "Que dois-je porter et apporter pour le vol ?",
        aText: "Portez des chaussures fermées : c'est indispensable pour monter dans l'avion et circuler sur la piste. Habillez-vous selon la météo du jour : un pull ou une veste légère est conseillé en toute saison, une veste chaude en automne et en hiver. N'apportez pas de bagages volumineux, l'espace est limité dans l'avion. Un appareil photo, un téléphone ou de petits accessoires sont les bienvenus. Évitez de consommer de l'alcool dans les heures précédant le vol. Casques audio et gilets de sauvetage sont fournis à bord.",
        a: "Portez des chaussures fermées (obligatoire pour monter à bord et circuler sur la piste). Habillez-vous selon la météo : pull ou veste légère en toute saison, veste chaude en hiver. Pas de bagages volumineux, l'espace est limité. Appareil photo et téléphone sont les bienvenus. Évitez l'alcool avant le vol. Casques et gilets fournis.",
      },
      {
        q: "Je suis enceinte ou j'ai une condition médicale, puis-je voler ?",
        aText: "En cas de grossesse, consultez votre médecin avant de réserver. Il n'y a pas de contre-indication générale pour les vols légers, mais les vibrations et les légères variations d'altitude peuvent être inconfortables. Pour toute condition médicale particulière (problème cardiaque, claustrophobie, traitement lourd, handicap moteur), signalez-le lors de la réservation ou contactez-nous avant de réserver : nous évaluerons ensemble la faisabilité en toute transparence.",
        a: <>En cas de grossesse, consultez votre médecin avant de réserver. Pour toute condition médicale particulière (problème cardiaque, claustrophobie, traitement lourd, handicap moteur), signalez-le lors de la réservation ou <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">contactez-nous</Link> : nous évaluerons ensemble la faisabilité.</>,
      },
      {
        q: "Que se passe-t-il si je suis en retard le jour du vol ?",
        aText: "Prévenez-nous dès que possible par téléphone ou email. Un léger retard de quelques minutes peut généralement être absorbé. Au-delà de 15 minutes, le créneau peut être compromis selon la disponibilité du planning. En cas d'absence sans prévenir (no-show), la provision reste acquise et aucun remboursement ne peut être effectué.",
        a: <>Prévenez-nous dès que possible. Un léger retard peut être absorbé. Au-delà de 15 minutes, le créneau peut être compromis. En cas d'absence sans prévenir, la provision reste acquise. <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">Nous contacter</Link>.</>,
      },
      {
        q: "Comment suivre l'état de ma réservation ?",
        aText: "Connectez-vous à votre espace client : vous y retrouvez le statut de votre réservation en temps réel (en attente, provision reçue, date confirmée, heure confirmée). Chaque changement de statut vous est également notifié par email.",
        a: <>Connectez-vous à votre <Link href="/account" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">espace client</Link> : vous y retrouvez le statut en temps réel (en attente, provision reçue, date confirmée, heure confirmée). Chaque changement vous est notifié par email.</>,
      },
      {
        q: "À quelle heure décollera-t-on exactement ?",
        aText: "L'heure précise est confirmée par le pilote dans les jours qui précèdent le vol, en fonction des conditions météo et du trafic. Vous recevez la confirmation par email et via votre espace client.",
        a: "L'heure précise est confirmée par le pilote dans les jours qui précèdent le vol, en fonction des conditions météo et du trafic. Vous recevez la confirmation par email et via votre espace client.",
      },
      {
        q: "Dans quel délai ma réservation est-elle confirmée ?",
        aText: "La réservation est validée dans un délai maximum de 48 heures après réception de la provision, en pratique souvent en 2 à 4 heures. Vous recevez un email de confirmation dès que le pilote a vérifié la disponibilité et les conditions de vol.",
        a: "La réservation est validée dans un délai maximum de 48 heures après réception de la provision, en pratique souvent en 2 à 4 heures. Vous recevez un email de confirmation dès que le pilote a validé la disponibilité.",
      },
      {
        q: "Peut-on voler dans d'autres pays que la Belgique ?",
        aText: "Oui. Les vols peuvent s'étendre à la France, l'Allemagne, les Pays-Bas et le Royaume-Uni, dans les limites de l'espace aérien autorisé et selon les conditions météo. Signalez votre destination souhaitée lors de la réservation ou via le formulaire de contact : le pilote vérifie la faisabilité et les autorisations nécessaires.",
        a: <>Oui. Les vols peuvent s&apos;étendre à la France, l&apos;Allemagne, les Pays-Bas et le Royaume-Uni, dans les limites autorisées. Signalez votre destination lors de la réservation ou via le <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">formulaire de contact</Link> : le pilote vérifie la faisabilité.</>,
      },
    ],
  },
  {
    id: "a-bord",
    title: "À bord",
    Icon: PlaneTakeoff,
    items: [
      {
        q: "Combien de passagers peuvent monter à bord ?",
        aText: "L'avion dispose de 4 places : le pilote et jusqu'à 3 passagers. Si vous êtes plus de 3, il faudra prévoir plusieurs vols.",
        a: "L'avion dispose de 4 places : le pilote et jusqu'à 3 passagers. Si vous êtes plus de 3, il faudra prévoir plusieurs vols.",
      },
      {
        q: "Y a-t-il une limite de poids ?",
        aText: "Oui. Le poids total des passagers ne peut pas dépasser 190 kg. Au-delà, le vol n'est pas réalisable pour des raisons de sécurité et de centrage (calcul masse & centrage de l'avion). C'est pourquoi le poids total est demandé lors de la réservation.",
        a: "Oui. Le poids total des passagers ne peut pas dépasser 190 kg. Au-delà, le vol n'est pas réalisable pour des raisons de sécurité et de centrage (calcul masse & centrage de l'avion). C'est pourquoi le poids total est demandé lors de la réservation.",
      },
      {
        q: "Y a-t-il un âge minimum pour voler ?",
        aText: "Non. Il n'y a pas d'âge minimum. Un enfant peut monter à bord à condition d'être accompagné d'un adulte. Il peut même s'asseoir à l'avant, sous réserve de ne pas toucher aux commandes.",
        a: "Non. Il n'y a pas d'âge minimum. Un enfant peut monter à bord à condition d'être accompagné d'un adulte. Il peut même s'asseoir à l'avant, sous réserve de ne pas toucher aux commandes.",
      },
      {
        q: "Faut-il des capacités physiques particulières ?",
        aText: "Il faut pouvoir monter dans l'avion via un marchepied, ce qui équivaut à grimper 3 à 4 marches. Aucune autre aptitude physique particulière n'est requise.",
        a: "Il faut pouvoir monter dans l'avion via un marchepied, ce qui équivaut à grimper 3 à 4 marches. Aucune autre aptitude physique particulière n'est requise.",
      },
      {
        q: "Le vol est-il bruyant ?",
        aText: "Non. Des casques antibruit sont fournis à bord pour tous les passagers. Ils permettent aussi de communiquer avec le pilote pendant tout le vol.",
        a: "Non. Des casques antibruit sont fournis à bord pour tous les passagers. Ils permettent aussi de communiquer avec le pilote pendant tout le vol.",
      },
      {
        q: "Puis-je toucher les commandes de l'avion ?",
        aText: "Oui, en phase de croisière et sous supervision du pilote. Vous sentez les réponses réelles de l'avion : tangage, roulis, gouverne de direction.",
        a: "Oui, en phase de croisière et sous supervision du pilote. Vous sentez les réponses réelles de l'avion : tangage, roulis, gouverne de direction.",
      },
      {
        q: "À quelle altitude vole-t-on ? Est-ce impressionnant ?",
        aText: "Les vols se déroulent généralement entre 2 000 et 3 000 ft d'altitude, soit environ 600 à 1 000 m, selon l'itinéraire et la météo. À titre de comparaison, un avion de ligne vole à 10 000 m : ici, vous volez bas et vous voyez vraiment le sol défiler sous vous. L'avion vole à environ 120 kt (220 km/h), une allure fluide et agréable. L'avion est un Diamond DA40 à cockpit vitré : la vue est panoramique, à 360°. Certains passagers ressentent une légère appréhension au décollage, qui disparaît très vite en vol. Le pilote commente tout au long du trajet et peut adapter l'altitude si vous le demandez.",
        a: "Les vols se déroulent généralement entre 2 000 et 3 000 ft d'altitude (environ 600 à 1 000 m), selon l'itinéraire et la météo. À titre de comparaison, un avion de ligne vole à 10 000 m : ici, vous volez bas et voyez vraiment le sol. L'avion croise à 120 kt (220 km/h), une allure douce et agréable. Le Diamond DA40 est un appareil à cockpit vitré : vue panoramique à 360°. Certains passagers ressentent une légère appréhension au décollage, elle disparaît très vite. Le pilote commente tout au long du trajet et peut adapter l'altitude si vous le demandez.",
      },
      {
        q: "J'ai peur de voler, est-ce fait pour moi ?",
        aText: "C'est une préoccupation très courante, et nous l'entendons souvent. Ce que vous ressentez est parfaitement normal : beaucoup de passagers montent à bord avec une certaine appréhension, et la grande majorité repart surpris de s'être sentis à l'aise dès les premières minutes. La différence avec un vol commercial : vous n'êtes pas enfermé dans une cabine. Vous êtes dans le cockpit, vous voyez ce que fait le pilote, vous comprenez ce qui se passe. Ce sentiment de transparence change tout. Les vols se déroulent à altitude modérée (600 à 1 000 m), à allure douce, loin des turbulences des altitudes commerciales. Si vous avez envie de redescendre ou si vous vous sentez mal à l'aise, vous le dites. Si vous avez le moindre doute, contactez-nous avant de réserver : nous vous répondons directement et prenons le temps de vous expliquer.",
        a: <>C&apos;est une préoccupation très courante, et nous l&apos;entendons souvent. Ce que vous ressentez est parfaitement normal : beaucoup de passagers montent à bord avec une certaine appréhension, et la grande majorité repart surpris de s&apos;être sentis à l&apos;aise dès les premières minutes.<br /><br />La différence avec un vol commercial : vous n&apos;êtes pas enfermé dans une cabine. Vous êtes dans le cockpit, vous voyez ce que fait le pilote, vous comprenez ce qui se passe : ce sentiment de transparence change tout. Les vols se déroulent à altitude modérée (600 à 1 000 m), à allure douce, loin des turbulences des altitudes commerciales.<br /><br />Si vous ressentez un inconfort pendant le vol, vous le dites et on s&apos;adapte. Si vous avez le moindre doute avant de réserver, <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">contactez-nous</Link> : nous vous répondons directement.</>,
      },
      {
        q: "Les passagers sont-ils assurés pendant le vol ?",
        aText: "Oui. L'avion utilisé (Diamond DA40) appartient à Air Academy New CAG (ATO-005, EBCI), école d'aviation certifiée. L'assurance de l'école couvre tous les occupants à bord. Ce vol est organisé dans le cadre du partage de frais réglementé par le règlement européen NCO.GEN.104 (aviation légère non commerciale). Pour toute question sur les garanties, contactez-nous avant de réserver.",
        a: <>Oui. L&apos;avion utilisé (Diamond DA40) appartient à Air Academy New CAG (ATO-005, EBCI), école d&apos;aviation certifiée. L&apos;assurance de l&apos;école couvre tous les occupants à bord. Ce vol est organisé dans le cadre du partage de frais réglementé par le règlement européen NCO.GEN.104 (aviation légère non commerciale). Pour toute question, <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">contactez-nous</Link> avant de réserver.</>,
      },
      {
        q: "Peut-on prendre des photos et des vidéos pendant le vol ?",
        aText: "Oui, sans restriction. Pensez à charger vos appareils avant le vol et à les sécuriser pour éviter tout incident à bord.",
        a: "Oui, sans restriction. Pensez à charger vos appareils avant le vol et à les sécuriser (dragonne, pochette) pour éviter tout incident à bord.",
      },
      {
        q: "Est-ce que je reçois un certificat après le vol ?",
        aText: "Un certificat de baptême de l'air peut être délivré sur demande, sans frais supplémentaires. Signalez votre souhait avant ou après le vol.",
        a: "Un certificat de baptême de l'air peut être délivré sur demande, sans frais supplémentaires. Signalez votre souhait avant ou après le vol.",
      },
    ],
  },
  {
    id: "compte",
    title: "Votre compte",
    Icon: Users,
    items: [
      {
        q: "Comment créer un compte ?",
        aText: "Un compte est créé automatiquement lors de votre première réservation ou commande. Vous pouvez aussi vous inscrire directement depuis la page de connexion. Votre compte vous donne accès au suivi de vos réservations, commandes et codes de vol.",
        a: <>Un compte est créé automatiquement lors de votre première réservation ou commande. Vous pouvez aussi vous inscrire depuis la <Link href="/login" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">page de connexion</Link>.</>,
      },
      {
        q: "Mes codes de vol sont-ils visibles dans mon compte ?",
        aText: "Oui. Tous vos bons cadeaux achetés apparaissent dans la section Codes de vol de votre espace client, avec leur statut : disponible, réservé ou utilisé.",
        a: <>Oui. Tous vos bons cadeaux apparaissent dans la section <Link href="/account" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">Codes de vol</Link> de votre espace client, avec leur statut : disponible, réservé ou utilisé.</>,
      },
      {
        q: "Je n'ai pas reçu l'email de confirmation, que faire ?",
        aText: "Vérifiez vos spams. Si l'email n'y est pas, connectez-vous à votre espace client : le statut et les détails de votre réservation y sont toujours accessibles. En dernier recours, contactez-nous.",
        a: <>Vérifiez vos spams. Si l'email n'y est pas, connectez-vous à votre <Link href="/account" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">espace client</Link> : le statut et les détails de votre réservation y sont toujours accessibles. En dernier recours, <Link href="/contact" className="text-primary font-semibold hover:text-[#e6a800] transition-colors">contactez-nous</Link>.</>,
      },
    ],
  },
];

// ── Schéma SEO ──────────────────────────────────────────────────────────────

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: THEMES.flatMap((t) =>
    t.items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.aText },
    }))
  ),
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  const [openKey, setOpenKey]         = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const query = search.trim();

  const results = useMemo(() => {
    const words = expandWords(
      normalize(query).split(/\s+/).filter((w) => w.length >= 2)
    );
    const isSearching = words.length > 0;

    return THEMES.flatMap((theme) =>
      theme.items
        .map((item) => ({
          theme,
          item,
          score: isSearching ? scoreItem(item.q, item.aText, words) : 1,
        }))
        .filter(({ score }) => score > 0)
    )
      .sort((a, b) => (query ? b.score - a.score : 0))
      .filter(({ theme }) => !activeTheme || theme.id === activeTheme);
  }, [query, activeTheme]);

  const grouped = useMemo(() => {
    if (query) return null;
    const map: Record<string, typeof results> = {};
    for (const r of results) {
      if (!map[r.theme.id]) map[r.theme.id] = [];
      map[r.theme.id].push(r);
    }
    return map;
  }, [results, query]);

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      <section className="pt-[98px] pb-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10">

          {/* En-tête */}
          <div className="mb-10 pt-12">
            <p className="text-xs font-bold text-primary uppercase tracking-[3px] mb-4">Questions fréquentes</p>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground leading-none tracking-tight mb-4">
              Vous avez des questions ?
            </h1>
            <p className="text-foreground/60 text-sm max-w-lg leading-relaxed">
              Réservation, paiement, bons cadeaux, expérience à bord : trouvez rapidement ce dont vous avez besoin.
            </p>
          </div>

          {/* Recherche */}
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher : provision, bon cadeau, météo, annulation…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpenKey(null); setActiveTheme(null); }}
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
            />
            {query && (
              <button
                onClick={() => { setSearch(""); setOpenKey(null); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtres par thème */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-8">
            <button
              onClick={() => { setActiveTheme(null); setSearch(""); setOpenKey(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                !activeTheme && !query ? "bg-navy text-white" : "bg-white text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              Tout
            </button>
            {THEMES.map(({ id, title, Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTheme(id === activeTheme ? null : id); setSearch(""); setOpenKey(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeTheme === id ? "bg-navy text-white" : "bg-white text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                <Icon size={11} />
                {title}
              </button>
            ))}
          </div>

          {/* Résultats */}
          {results.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-muted-foreground text-sm">Aucun résultat pour &laquo;&nbsp;{search}&nbsp;&raquo;.</p>
              <Link href="/contact" className="text-sm text-foreground font-semibold hover:text-primary transition-colors">
                Posez-nous la question directement →
              </Link>
            </div>
          ) : query ? (
            <div className="space-y-8">
              <p className="text-xs text-muted-foreground">
                {results.length} résultat{results.length > 1 ? "s" : ""} pour &laquo;&nbsp;{query}&nbsp;&raquo;
              </p>
              <div className="card-premium divide-y divide-border overflow-hidden">
                <FaqList items={results} openKey={openKey} toggle={toggle} />
              </div>
            </div>
          ) : grouped ? (
            <div className="space-y-8">
              {THEMES.filter((t) => !activeTheme || t.id === activeTheme).map((theme) => {
                const items = grouped[theme.id];
                if (!items || items.length === 0) return null;
                return (
                  <div key={theme.id}>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[2px] mb-3">
                      {theme.title}
                    </p>
                    <div className="card-premium divide-y divide-border overflow-hidden">
                      <FaqList items={items} openKey={openKey} toggle={toggle} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* CTA contact */}
          <div className="mt-10 bg-navy rounded-lg p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <MessageCircle size={16} className="text-primary" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-bold text-white">Vous ne trouvez pas votre réponse ?</p>
              <p className="text-xs text-white/50 mt-0.5">Nous vous répondons personnellement sous 24 h.</p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 px-5 py-2.5 text-sm font-black bg-primary text-primary-foreground rounded-lg hover:bg-[#e6a800] transition-colors shadow-gold"
            >
              Nous contacter
            </Link>
          </div>

        </div>
      </section>

      <ChatWidget mobileVisible />
    </main>
  );
}

// ── Composant liste ─────────────────────────────────────────────────────────

function FaqList({
  items,
  openKey,
  toggle,
}: {
  items: { theme: Theme; item: FaqItem }[];
  openKey: string | null;
  toggle: (key: string) => void;
}) {
  return (
    <>
      {items.map(({ theme, item }) => {
        const key = `${theme.id}::${item.q}`;
        const open = openKey === key;
        return (
          <div key={key}>
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/60 transition-colors cursor-pointer"
              aria-expanded={open}
            >
              <span className="text-sm font-medium text-foreground">{item.q}</span>
              <ChevronDown
                size={15}
                className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
              />
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="px-5 pb-4 border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

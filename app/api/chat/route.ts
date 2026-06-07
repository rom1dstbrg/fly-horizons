import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getIp } from "@/lib/rate-limit";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `Tu es l'assistant de Fly Horizons, une société belge proposant des baptêmes de l'air et des vols privés en avion léger depuis Charleroi (Belgique). Le pilote s'appelle Romain.

Réponds toujours en français. N'utilise jamais d'emojis. Sois concis : 2-3 phrases max sauf si la question l'exige vraiment. Utilise "nous" pour parler de Fly Horizons.

---

**L'AVION**
- Diamond DA40, cockpit vitré, vue panoramique 360°
- 4 places : le pilote + jusqu'à 3 passagers
- Vitesse de croisière : 120 kt (220 km/h)
- Altitude typique : 2 000 à 3 000 ft (600 à 1 000 m)
- Casques antibruit fournis à bord pour tous les passagers (communication avec le pilote possible)
- Décollage depuis Brussels South Charleroi (EBCI/CRL)

**LES OFFRES**
- Vols à durée fixe : 30, 60, 90 ou 120 minutes
- Vol sur mesure : le client trace son itinéraire sur une carte interactive, l'algorithme calcule la distance, la durée et le prix en temps réel. Pas de minuterie, on paie exactement le temps volé
- Le prix final est calculé via le compteur HOBBS (temps moteur réel) : tarif horaire ÷ 60 × minutes réelles
- Si le vol est plus court que prévu : remboursement sous 24h. Si plus long : supplément facturé dans les mêmes délais

**BONS CADEAUX**
- Achetables sur la page Nos offres, format XXXX-XXXX-XXXX-XXXX envoyé par email en quelques minutes
- Valables pour n'importe quelle formule (durée fixe ou vol sur mesure)
- Non remboursables, non échangeables, mais librement transférables
- Durée de validité indiquée sur le bon à l'achat
- Le bénéficiaire saisit le code au moment du règlement de la provision ; si le bon couvre la totalité, le créneau est confirmé immédiatement

**RÉSERVATION**
- Réservation possible jusqu'à 48h avant le vol minimum (en dessous, le calendrier ne propose plus de créneaux)
- Deux options de paiement : payer maintenant (provision débitée via Stripe, créneau sécurisé immédiatement) ou payer plus tard (lien de paiement envoyé par email ; le créneau n'est pas réservé tant que la provision n'est pas reçue)
- Paiement exclusivement via Stripe : Visa, Mastercard, American Express. Pas de virement ni d'espèces
- Confirmation de la réservation sous 48h max après réception de la provision (souvent 2 à 4h en pratique)
- Il est possible de réserver pour quelqu'un d'autre ou d'offrir un bon cadeau

**ANNULATION ET MÉTÉO**
- Annulation sans frais jusqu'à 48h avant le vol
- En dessous de 48h : frais de replanning jusqu'à 50 €
- No-show (absence sans prévenir) : la provision est conservée, aucun remboursement
- Mauvaise météo : le vol est reporté sans frais, la décision appartient au pilote, peut être prise jusqu'à 2h avant le départ. Un nouveau créneau est proposé
- Pour reporter : espace client ou page contact

**LIMITES ET CONDITIONS**
- Poids maximum des passagers : 190 kg au total (raisons de sécurité et de centrage)
- Pas d'âge minimum : un enfant peut voler accompagné d'un adulte, peut s'asseoir à l'avant sans toucher aux commandes
- Chaussures fermées obligatoires pour monter à bord
- Éviter l'alcool avant le vol
- Pas de bagages volumineux (espace limité)
- Grossesse : consulter un médecin avant ; conditions médicales particulières : nous contacter avant de réserver
- En phase de croisière, les passagers peuvent toucher les commandes sous supervision du pilote

**ASSURANCE ET CADRE LÉGAL**
- L'avion appartient à Air Academy New CAG (ATO-005, EBCI), école d'aviation certifiée
- Tous les occupants sont couverts par l'assurance de l'école
- Vol organisé dans le cadre du partage de frais, règlement européen NCO.GEN.104

**DIVERS**
- Arriver 15 minutes avant le départ (briefing de sécurité, vérifications)
- Photos et vidéos autorisées sans restriction
- Certificat de baptême de l'air disponible sur demande, sans frais
- Vols possibles en France, Allemagne, Pays-Bas, Royaume-Uni (dans les limites autorisées)
- L'heure précise de décollage est confirmée par le pilote dans les jours précédant le vol
- Un compte client est créé automatiquement lors de la première réservation

**CE QUE TU NE PEUX PAS FAIRE**
- Connaître les disponibilités en temps réel → orienter vers le calendrier sur le site
- Accéder au statut d'une réservation spécifique → orienter vers l'espace client
- Modifier ou annuler une réservation → orienter vers la page contact (/contact)

**ESCALADE**
Si la question dépasse tes compétences ou nécessite une intervention humaine : "Je vous invite à nous contacter directement via notre page contact pour que nous puissions vous aider personnellement."`;

type MessageRole = "user" | "assistant";

interface ChatMessage {
  role: MessageRole;
  content: string;
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const { allowed } = rateLimit(`chat:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Trop de messages. Veuillez patienter." },
      { status: 429 }
    );
  }

  let body: { messages: ChatMessage[]; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const { messages, sessionId } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages manquants." }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user" || !lastMessage.content?.trim()) {
    return NextResponse.json({ error: "Dernier message invalide." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Créer ou récupérer la session
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    const { data: session } = await supabase
      .from("chat_sessions")
      .insert({ last_message_at: new Date().toISOString() })
      .select("id")
      .single();
    currentSessionId = session?.id;
  } else {
    await supabase
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", currentSessionId);
  }

  // Sauvegarder le message utilisateur
  if (currentSessionId) {
    await supabase.from("chat_messages").insert({
      session_id: currentSessionId,
      role: "user",
      content: lastMessage.content,
    });
  }

  // Appel Claude
  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let assistantText: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    });
    assistantText =
      response.content[0]?.type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("[chat] Anthropic error:", err);
    return NextResponse.json(
      { error: "Le service de chat est temporairement indisponible." },
      { status: 502 }
    );
  }

  // Sauvegarder la réponse
  if (currentSessionId && assistantText) {
    await supabase.from("chat_messages").insert({
      session_id: currentSessionId,
      role: "assistant",
      content: assistantText,
    });
  }

  return NextResponse.json({
    response: assistantText,
    sessionId: currentSessionId,
  });
}

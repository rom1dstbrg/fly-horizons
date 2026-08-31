// Frais carte Stripe (zone UE) : 1,5 % + 0,25 €. Utilisé uniquement en repli quand le
// frais réel (stripe_fee, capturé par le webhook sur la balance_transaction) n'a pas
// encore été enregistré — ex. paiements antérieurs à l'ajout de cette fonctionnalité.
export function estimateStripeFee(amount: number): number {
  return Math.round((amount * 0.015 + 0.25) * 100) / 100;
}

export interface StripeNetInfo {
  net: number;
  fee: number;
  isEstimate: boolean;
}

// Retourne null quand aucun frais ne s'applique (rien payé, cash, ou intégralement
// couvert par un voucher — déjà encaissé, avec sa propre commission, lors de son achat).
export function stripeNetInfo(params: {
  paye: number;
  stripeFee: number | null | undefined;
  cashPayment?: boolean | null;
  coveredByVoucher?: boolean;
}): StripeNetInfo | null {
  const { paye, stripeFee, cashPayment, coveredByVoucher } = params;
  if (paye <= 0 || cashPayment || coveredByVoucher) return null;
  const fee = stripeFee ?? estimateStripeFee(paye);
  return {
    net: Math.round((paye - fee) * 100) / 100,
    fee,
    isEstimate: stripeFee == null,
  };
}

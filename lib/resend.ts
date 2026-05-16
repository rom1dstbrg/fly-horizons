import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = "Fly Horizons <info@fly-horizons.com>";
export const EMAIL_REPLY_TO = "info@fly-horizons.com";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = "Fly Horizons Shop <onboarding@resend.dev>";
export const EMAIL_REPLY_TO = "shop@fly-horizons.com";
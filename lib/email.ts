import nodemailer from "nodemailer";
import { getEmailEnv } from "@/src/env";

export async function sendVerificationEmail(to: string, code: string) {
  const env = getEmailEnv();

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Verify your Zakovat account",
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
  });
}

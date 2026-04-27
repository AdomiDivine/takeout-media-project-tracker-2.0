import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `"TM Slate" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });

  console.log("[email] sent to", to, "messageId:", info.messageId);
  return info;
}

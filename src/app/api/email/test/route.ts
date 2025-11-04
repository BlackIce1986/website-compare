'use server';

import { sendEmail } from "@/lib/email-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  await sendEmail({
    to: email as string,
    subject: 'Test Email' as string,
    text: 'This is a test email from the Website Compare application.',
    html: '<p>This is a test email from the Website Compare application.</p>',
  });
  return NextResponse.json({ message: 'Test email sent successfully' });
}
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { OnboardingWizard } from './_components/onboarding-wizard';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboarded: true, name: true },
  });

  if (user?.onboarded) redirect('/dashboard');

  return <OnboardingWizard userName={user?.name || 'there'} />;
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed test user
  const hashedPassword = await bcrypt.hash('johndoe123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { onboarded: true },
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
      onboarded: true,
    },
  });

  console.log('Seeded user:', user.email);

  // Seed sample resume
  await prisma.resume.upsert({
    where: { id: 'seed-resume-1' },
    update: {},
    create: {
      id: 'seed-resume-1',
      userId: user.id,
      title: 'Software Engineer Resume',
      template: 'modern',
      fullName: 'John Doe',
      email: 'john@doe.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer with 5+ years of expertise in full-stack development, cloud architecture, and agile methodologies.',
      experience: JSON.stringify([
        {
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          startDate: 'Jan 2022',
          endDate: 'Present',
          description: '- Led development of microservices architecture serving 1M+ users\n- Reduced API response times by 40% through optimization\n- Mentored 3 junior developers',
        },
        {
          title: 'Software Engineer',
          company: 'StartupXYZ',
          startDate: 'Jun 2019',
          endDate: 'Dec 2021',
          description: '- Built React-based dashboard increasing user engagement by 25%\n- Implemented CI/CD pipelines reducing deployment time by 60%',
        },
      ]),
      education: JSON.stringify([
        { degree: 'B.S. Computer Science', school: 'UC Berkeley', year: '2019' },
      ]),
      skills: JSON.stringify(['TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'PostgreSQL', 'Docker']),
    },
  });

  // Seed sample jobs
  const jobsData = [
    { id: 'seed-job-1', company: 'Google', position: 'Senior Software Engineer', location: 'Mountain View, CA', status: 'applied', salary: '$180K - $250K', notes: 'Referral from college friend' },
    { id: 'seed-job-2', company: 'Meta', position: 'Full Stack Engineer', location: 'Remote', status: 'interview', salary: '$160K - $220K', notes: 'Phone screen scheduled' },
    { id: 'seed-job-3', company: 'Stripe', position: 'Backend Engineer', location: 'San Francisco, CA', status: 'wishlist', salary: '$170K - $240K' },
    { id: 'seed-job-4', company: 'Netflix', position: 'Platform Engineer', location: 'Los Gatos, CA', status: 'offer', salary: '$200K - $280K', notes: 'Offer received!' },
    { id: 'seed-job-5', company: 'Airbnb', position: 'Software Engineer II', location: 'San Francisco, CA', status: 'rejected', salary: '$155K - $210K' },
  ];

  for (const job of jobsData) {
    await prisma.job.upsert({
      where: { id: job.id },
      update: {},
      create: {
        id: job.id,
        userId: user.id,
        company: job.company,
        position: job.position,
        location: job.location ?? '',
        status: job.status,
        salary: job.salary ?? '',
        notes: job.notes ?? '',
      },
    });
  }

  console.log('Seeded sample data');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const { deriveAnonId, hashEmail, hashPassword } = require("../src/utils/crypto");

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Tech", slug: "tech", icon: "laptop-outline", colorBg: "#1a2744", colorFg: "#5b9cf6" },
  { name: "Legal", slug: "legal", icon: "scale-outline", colorBg: "#1e1a2e", colorFg: "#a78bfa" },
  { name: "Finance", slug: "finance", icon: "trending-up-outline", colorBg: "#2a1a1a", colorFg: "#f87171" },
  { name: "Healthcare", slug: "healthcare", icon: "medkit-outline", colorBg: "#1a2a1a", colorFg: "#4ade80" },
  { name: "Management", slug: "management", icon: "people-outline", colorBg: "#2a1f0a", colorFg: "#fbbf24" },
];

const TAGS = ["Salary", "Management", "Ethics", "Burnout", "Career Switch", "Legal", "HR"];

async function main() {
  console.log("Seeding categories...");
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  console.log("Seeding tags...");
  for (const name of TAGS) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    await prisma.tag.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }

  console.log("Seeding demo user...");
  const email = "demo@anonymousdesk.test";
  const password = "DemoPass123";
  const emailHash = hashEmail(email);

  const existing = await prisma.user.findUnique({ where: { emailHash } });
  if (!existing) {
    await prisma.user.create({
      data: {
        anonId: deriveAnonId(email, password),
        emailHash,
        passwordHash: await hashPassword(password),
        industry: "Technology",
        jobTitle: "Software Engineer",
        experienceYears: 7,
        karma: 120,
        trustLevel: "contributor",
      },
    });
    console.log(`Demo user created — login with ${email} / ${password}`);
  } else {
    console.log("Demo user already exists, skipping.");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

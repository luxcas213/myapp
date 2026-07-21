// Owner-only user creation — there is no public signup page.
// Usage: npx tsx scripts/create-user.ts <username> <password>
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage: npx tsx scripts/create-user.ts <username> <password>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });

  console.log(`User "${user.username}" saved (id: ${user.id}).`);
  await prisma.$disconnect();
}

main();

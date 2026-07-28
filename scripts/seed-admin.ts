import "dotenv/config";
import { db } from "../db/connection";
import { users, authCredentials } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../api/lib/auth";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@promurcia.com";
  const password = process.env.ADMIN_PASSWORD ?? "Promurcia2026!";
  const name = process.env.ADMIN_NAME ?? "Administrador Promurcia";

  let user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    const result = await db
      .insert(users)
      .values({
        name,
        email,
        role: "superCEO",
        status: "active",
      })
      .returning();
    user = result[0];
    console.log(`Usuario admin creado: ${user.email} (id=${user.id})`);
  } else {
    console.log(`Usuario admin ya existe: ${user.email} (id=${user.id})`);
  }

  const hash = await hashPassword(password);
  await db
    .insert(authCredentials)
    .values({ userId: user.id, passwordHash: hash })
    .onConflictDoUpdate({
      target: authCredentials.userId,
      set: { passwordHash: hash, updatedAt: new Date() },
    });

  console.log(`Contraseña actualizada para ${email}`);
  console.log(`Puedes iniciar sesión con: ${email} / ${password}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

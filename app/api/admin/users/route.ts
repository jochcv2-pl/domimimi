import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/users — liste les comptes administrateurs.
 * POST /api/admin/users — crée un nouveau compte admin.
 *
 * Sécurité : requiert une session authentifiée + rôle ADMIN ou SUPER_ADMIN.
 * La création est réservée à SUPER_ADMIN.
 */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return null;
  return { session, role };
}

export async function GET() {
  const access = await requireAdmin();
  if (!access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const access = await requireAdmin();
  if (!access) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  if (access.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Seul un super-administrateur peut créer des comptes.' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { name, email, password, role } = body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 422 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Le mot de passe doit faire au moins 8 caractères.' },
      { status: 422 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: 'Cet e-mail est déjà utilisé.' }, { status: 409 });
  }

  // Cost factor ≥ 12 (sécurité)
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name?.trim() || null,
      email: normalizedEmail,
      passwordHash,
      role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { compare } from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        })

        if (!user || !user.password) {
          throw new Error("Email ou mot de passe incorrect")
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Email ou mot de passe incorrect")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id

        // Au premier login, récupérer la dernière organisation visitée
        const userWithMembership = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            memberships: {
              include: {
                organization: {
                  select: {
                    slug: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        })

        if (userWithMembership?.memberships[0]?.organization) {
          token.lastOrganizationSlug = userWithMembership.memberships[0].organization.slug
        }
      }

      // Si la session est mise à jour (ex: changement d'organisation)
      if (trigger === "update" && session?.lastOrganizationSlug) {
        token.lastOrganizationSlug = session.lastOrganizationSlug
      }

      // IMPORTANT: Nettoyer le token pour éviter les données volumineuses
      // Ne pas stocker l'image dans le JWT (peut être très volumineuse)
      delete token.picture
      delete token.image

      // Limiter lastOrganizationSlug à 50 caractères max
      if (token.lastOrganizationSlug && typeof token.lastOrganizationSlug === 'string') {
        token.lastOrganizationSlug = token.lastOrganizationSlug.substring(0, 50)
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.lastOrganizationSlug = token.lastOrganizationSlug
      }
      return session
    },
  },
})

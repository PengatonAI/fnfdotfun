import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import { prisma } from "@/lib/prisma";

// Ensure NEXTAUTH_URL is set (fallback for localhost)
// The callback URL will be automatically constructed as: ${NEXTAUTH_URL}/api/auth/callback/twitter
// Make sure this exact URL is configured in your Twitter/X Developer Portal
if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV !== "production") {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}

// Ensure NEXTAUTH_SECRET is set (required for OAuth state encryption)
if (!process.env.NEXTAUTH_SECRET) {
  console.error("❌ NEXTAUTH_SECRET is missing! OAuth state cookies will fail to encrypt/decrypt.");
  console.error("Generate one with: openssl rand -base64 32");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Trust host for OAuth callbacks (fixes state cookie parsing issues)
  trustHost: true,

  // No adapter - using JWT strategy only
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "tweet.read users.read offline.access",
          response_type: "code",
        },
      },
      token: "https://api.twitter.com/2/oauth2/token",
      userinfo: "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username",
      profile(profile: any) {
        // Defensive logging for profile errors
        if (!profile || profile.error || profile.status === 403) {
          console.error("Twitter API returned forbidden or empty profile:", profile);
          return {
            id: "forbidden-" + Math.random().toString(36).substring(2),
            name: "Unknown User",
            email: `forbidden-${Math.random().toString(36).substring(2)}@x.com`,
            image: null,
          };
        }

        // Handle error responses gracefully
        if (profile?.status || profile?.title || profile?.detail) {
          const errorStatus = profile.status || "Unknown";
          const errorTitle = profile.title || "Error";
          const errorDetail = profile.detail || "No details provided";
          
          console.error("Twitter API error response:", {
            status: errorStatus,
            title: errorTitle,
            detail: errorDetail,
            fullResponse: profile,
          });
          
          // Return fallback profile instead of throwing
          return {
            id: "error-" + Math.random().toString(36).substring(2),
            name: "Unknown User",
            email: `error-${Math.random().toString(36).substring(2)}@x.com`,
            image: null,
          };
        }
        
        // Handle the v2 response format (data wrapper)
        const data = profile.data || profile;
        
        // Defensive check for missing data
        if (!data || !data.id) {
          console.error("Twitter profile data is missing or invalid:", profile);
          return {
            id: "missing-" + Math.random().toString(36).substring(2),
            name: "Unknown User",
            email: `missing-${Math.random().toString(36).substring(2)}@x.com`,
            image: null,
          };
        }
        
        // Log successful profile parsing
        console.log("Twitter profile parsed successfully:", {
          id: data.id,
          name: data.name,
          hasImage: !!data.profile_image_url,
        });
        
        return {
          id: data.id,
          name: data.name || data.username || `User ${data.id}`,
          email: data.email ?? `${data.id}@x.com`,
          image: data.profile_image_url || null,
          username: data.username,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // SECURITY: Use secure cookies in production (HTTPS only)
        // Allow HTTP in development for local testing
        secure: process.env.NODE_ENV === 'production',
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      console.log("Redirect debug:", { url, baseUrl, NEXTAUTH_URL: process.env.NEXTAUTH_URL });
      // SECURITY: Only allow redirects to same origin to prevent open redirect attacks
      // If url is relative, make it absolute
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      // Parse URL and validate origin
      try {
        const urlObj = new URL(url);
        // Only allow redirects to the same origin
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch (error) {
        // Invalid URL - redirect to baseUrl for safety
        console.warn("Invalid redirect URL:", url);
      }
      // Default to baseUrl for any external or invalid URLs
      return baseUrl;
    },
    async signIn({ user, account, profile }) {
      // Log OAuth sign-in attempt for debugging
      console.log("🔐 SIGNIN CALLBACK:", {
        provider: account?.provider,
        hasUser: !!user,
        hasAccount: !!account,
        hasProfile: !!profile,
        userKeys: user ? Object.keys(user) : [],
        accountKeys: account ? Object.keys(account) : [],
        profileKeys: profile ? Object.keys(profile) : [],
      });
      
      // For Twitter, log additional details
      if (account?.provider === "twitter") {
        const expectedScope = "tweet.read users.read offline.access";
        const scopeMatches = account.scope === expectedScope;
        
        console.log("🐦 Twitter sign-in details:", {
          accountId: account.providerAccountId,
          accessToken: account.access_token ? "present" : "missing",
          tokenType: account.token_type,
          scope: account.scope,
          scopeMatches: scopeMatches ? "✅ EXACT MATCH" : "❌ MISMATCH",
          expectedScope,
          expiresAt: account.expires_at,
          userEmail: user?.email,
          userName: user?.name,
        });
        
        // Warn if scope doesn't match expected value
        if (account.scope && !scopeMatches) {
          console.warn("⚠️ WARNING: Twitter scope mismatch! Expected:", expectedScope, "Got:", account.scope);
        }
      }
      
      // Always allow sign-in if OAuth provider authenticated successfully
      // User creation/lookup is handled in JWT callback to ensure token.id is Prisma User.id
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      // When user is present (during OAuth sign-in), fetch or create Prisma User
      if (user) {
        try {
          // CRITICAL: user.id here is the OAuth provider's ID, NOT Prisma User.id
          // We must fetch or create the Prisma User by email and use its ID
          if (!user.email) {
            console.error("❌ JWT CALLBACK: User email is missing! Cannot fetch/create Prisma User.");
            throw new Error("User email is required to create/fetch Prisma User");
          }

          // Fetch existing Prisma User by email
          let prismaUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!prismaUser) {
            // Create new Prisma User (Prisma will generate cuid() ID)
            const userData: any = {
              name: user.name,
              email: user.email,
              image: user.image,
              username: null,
              xHandle: null,
            };

            // Handle Twitter/X provider - extract username from email if it's the fallback format
            if (account?.provider === "twitter") {
              // Twitter email is in format: ${providerId}@x.com
              // We can extract the username from the user object if available
              // For Twitter, the username might be in the name field or we need to derive it
              // Since profile is not available in JWT callback, we'll set it later if needed
              // For now, generate a username
              const random = Math.floor(10000 + Math.random() * 90000);
              userData.username = `xuser${random}`;
            }

            // Handle Google provider - generate default username
            if (account?.provider === "google" && !userData.username) {
              const random = Math.floor(10000 + Math.random() * 90000);
              userData.username = `user${random}`;
            }

            prismaUser = await prisma.user.create({
              data: userData,
            });
            console.log("✅ JWT CALLBACK: Created new Prisma User with id:", prismaUser.id, "email:", prismaUser.email);
          } else {
            // Update existing user if needed
            const updateData: any = {};

            // Update Google name/image if changed
            if (account?.provider === "google") {
              if (user.name && user.name !== prismaUser.name) {
                updateData.name = user.name;
              }
              if (user.image && user.image !== prismaUser.image) {
                updateData.image = user.image;
              }
            }

            // Update Twitter/X name/image if changed
            if (account?.provider === "twitter") {
              if (user.name && user.name !== prismaUser.name) {
                updateData.name = user.name;
              }
              if (user.image && user.image !== prismaUser.image) {
                updateData.image = user.image;
              }
            }

            if (Object.keys(updateData).length > 0) {
              prismaUser = await prisma.user.update({
                where: { id: prismaUser.id },
                data: updateData,
              });
              console.log("✅ JWT CALLBACK: Updated Prisma User with id:", prismaUser.id);
            } else {
              console.log("✅ JWT CALLBACK: Found existing Prisma User with id:", prismaUser.id, "email:", prismaUser.email);
            }
          }

          // CRITICAL: Set token.id to Prisma User.id (NOT OAuth provider's user.id)
          token.id = prismaUser.id;
          console.log("🔑 JWT CALLBACK: Set token.id = Prisma User.id:", token.id, "OAuth provider user.id was:", user.id, "email:", user.email);
          
          // Store email and other user data in token
          token.email = prismaUser.email;
          token.name = prismaUser.name;
          token.image = prismaUser.image;
          token.username = prismaUser.username;
          token.xHandle = prismaUser.xHandle;
        } catch (error) {
          console.error("❌ JWT CALLBACK: Error fetching/creating Prisma User:", error);
          throw error; // Fail sign-in if we can't create/fetch user
        }
      } else if (trigger === "update") {
        // On session update, preserve existing token.id (should already be Prisma User.id)
        if (!token.id) {
          console.error("❌ JWT CALLBACK: token.id missing on update! This should not happen.");
          throw new Error("Token ID missing on session update");
        }
        console.log("✅ JWT CALLBACK: Session update - token.id preserved:", token.id);
      } else {
        // On subsequent requests, user is undefined - token.id should already be set (Prisma User.id)
        if (!token.id) {
          console.error("❌ JWT CALLBACK: token.id is missing on subsequent request! Token keys:", Object.keys(token));
          throw new Error("Token ID missing on subsequent request");
        }
        console.log("✅ JWT CALLBACK: token.id preserved (Prisma User.id):", token.id);
      }
      
      return token;
    },
    async session({ session, token }) {
      // CRITICAL: token.id is now always the Prisma User.id (set in JWT callback)
      // Debug logging
      console.log("🔍 SESSION CALLBACK:", {
        hasToken: !!token,
        hasTokenId: !!token.id,
        tokenId: token.id,
        tokenEmail: token.email,
        hasSession: !!session,
        hasSessionUser: !!session?.user,
        sessionUserKeys: session?.user ? Object.keys(session.user) : [],
      });

      // CRITICAL: Always set user.id from token.id (Prisma User.id)
      // Ensure user object exists
      if (!session.user) {
        session.user = {} as any;
      }
      
      // token.id is always the Prisma User.id (never use token.sub)
      if (!token.id) {
        console.error("❌ SESSION CALLBACK: token.id is missing! This should never happen. Token keys:", Object.keys(token));
        throw new Error("Session callback: Missing user ID in token (token.id must be Prisma User.id)");
      }
      
      // Set session.user.id to Prisma User.id
      session.user.id = token.id as string;
      console.log("✅ SESSION CALLBACK: Set session.user.id = token.id (Prisma User.id):", session.user.id);
      
      // Preserve other user properties from token
      if (token.email) {
        session.user.email = token.email;
      }
      if (token.image) {
        session.user.image = token.image as string;
      }
      if (token.username !== undefined && typeof token.username === 'string') {
        session.user.username = token.username;
      }
      if (token.xHandle !== undefined && typeof token.xHandle === 'string') {
        session.user.xHandle = token.xHandle;
      }
      
      // Ensure the session is properly structured for serialization
      return {
        ...session,
        user: {
          ...session.user,
          id: session.user.id, // Prisma User.id
        },
      };
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
});


import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email?: string | null;
      username?: string | null;
      xHandle?: string | null;
      image?: string | null;
      // name is NOT included - it's private and never exposed in session
    };
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    username?: string | null;
    xHandle?: string | null;
    image?: string | null;
    // name is NOT included - it's private
  }
}

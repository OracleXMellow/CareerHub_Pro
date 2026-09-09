import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/resumes/:path*",
    "/jobs/:path*",
    "/documents/:path*",
    "/cover-letters/:path*",
    "/ai-tools/:path*",
  ],
};

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectOS — Your project operating system",
  description: "An adaptive, local-demo project operating system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

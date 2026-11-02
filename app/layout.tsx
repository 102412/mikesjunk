import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectOS — Your project operating system",
  description: "An adaptive, local-demo project operating system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><svg className="glass-defs" aria-hidden="true"><filter id="projectos-liquid-refraction" x="-14%" y="-35%" width="128%" height="170%"><feTurbulence type="fractalNoise" baseFrequency=".008 .085" numOctaves="2" seed="17" result="liquidField"><animate attributeName="baseFrequency" dur="7s" values=".008 .085;.018 .055;.008 .085" repeatCount="indefinite"/></feTurbulence><feColorMatrix in="liquidField" type="saturate" values="0" result="softField"/><feDisplacementMap in="SourceGraphic" in2="softField" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter></svg>{children}</body></html>;
}

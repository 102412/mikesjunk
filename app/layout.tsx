import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectOS — Your project operating system",
  description: "An adaptive, local-demo project operating system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<svg className="liquid-filter-defs" aria-hidden="true" focusable="false"><filter id="projectos-nav-refraction" x="-12%" y="-35%" width="124%" height="170%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.014 0.085" numOctaves="1" seed="28" result="navNoise"/><feGaussianBlur in="navNoise" stdDeviation="0.45" result="softNoise"/><feDisplacementMap in="SourceGraphic" in2="softNoise" scale="10" xChannelSelector="R" yChannelSelector="G"/></filter></svg></body></html>;
}

"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type WordsPullUpProps = { text: string; className?: string; showAsterisk?: boolean };

/** Editorial word reveal adapted from the supplied 21st.dev reference. */
export function WordsPullUp({ text, className = "", showAsterisk = false }: WordsPullUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.35 });
  return <div ref={ref} className={`inline-flex flex-wrap ${className}`}>{text.split(" ").map((word, index, words) => <motion.span key={`${word}-${index}`} initial={{ y: 28, opacity: 0 }} animate={isInView ? { y: 0, opacity: 1 } : {}} transition={{ duration: 0.65, delay: index * 0.075, ease: [0.16, 1, 0.3, 1] }} className="relative inline-block" style={{ marginRight: index === words.length - 1 ? 0 : "0.22em" }}>{word}{showAsterisk && index === words.length - 1 && <sup className="hero-asterisk">*</sup>}</motion.span>)}</div>;
}

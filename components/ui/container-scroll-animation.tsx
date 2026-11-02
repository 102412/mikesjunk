"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { type ReactNode, useRef } from "react";

type ContainerScrollProps = {
  titleComponent?: ReactNode;
  children: ReactNode;
};

/**
 * A deliberately restrained scroll stage for the primary product demo.
 * The content settles into place as it enters view rather than performing a
 * decorative 3D flourish.
 */
export function ContainerScroll({ titleComponent, children }: ContainerScrollProps) {
  const containerRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 0.48, 1], reduceMotion ? [0, 0, 0] : [8, 0, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.48, 1], reduceMotion ? [1, 1, 1] : [0.94, 1, 1]);
  const translateY = useTransform(scrollYProgress, [0, 0.48, 1], reduceMotion ? [0, 0, 0] : [48, 0, 0]);

  return (
    <section className="container-scroll" ref={containerRef}>
      <div className="container-scroll-inner">
        {titleComponent && <motion.div style={{ y: translateY }} className="container-scroll-title">{titleComponent}</motion.div>}
        <motion.div
          className="container-scroll-card"
          style={{ rotateX, scale, y: translateY }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

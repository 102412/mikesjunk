"use client";

import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number; homeX: number; homeY: number; radius: number };

/** Interactive halftone lettering adapted from the supplied canvas wordmark. */
export function HalftoneHeroText({ lines, className = "" }: { lines: string[]; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lineKey = lines.join("\n");

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!root || !canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots: Dot[] = [];
    const gap = 4.5;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let pointerX = -10000;
    let pointerY = -10000;
    let animationFrame = 0;
    let ripple = { x: 0, y: 0, at: -10000 };

    const draw = (now: number) => {
      animationFrame = 0;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const ringAge = now - ripple.at;
      const ringRadius = ringAge * 0.85;
      let moving = false;

      for (const dot of dots) {
        if (!reducedMotion) {
          const dx = dot.x - pointerX;
          const dy = dot.y - pointerY;
          const distance = Math.hypot(dx, dy) + 0.001;
          if (distance < 76) {
            const force = (1 - distance / 76) * 2.2;
            dot.vx += (dx / distance) * force;
            dot.vy += (dy / distance) * force;
          }
          if (ringAge >= 0 && ringAge < 760) {
            const rx = dot.homeX - ripple.x;
            const ry = dot.homeY - ripple.y;
            const radius = Math.hypot(rx, ry) + 0.001;
            const band = 1 - Math.min(1, Math.abs(radius - ringRadius) / 22);
            if (band > 0) {
              const force = band * 2.4 * (1 - ringAge / 760);
              dot.vx += (rx / radius) * force;
              dot.vy += (ry / radius) * force;
            }
          }
          dot.vx = (dot.vx + (dot.homeX - dot.x) * 0.065) * 0.8;
          dot.vy = (dot.vy + (dot.homeY - dot.y) * 0.065) * 0.8;
          dot.x += dot.vx;
          dot.y += dot.vy;
          if (Math.abs(dot.vx) + Math.abs(dot.vy) > 0.025 || Math.abs(dot.x - dot.homeX) + Math.abs(dot.y - dot.homeY) > 0.08) moving = true;
          else {
            dot.x = dot.homeX;
            dot.y = dot.homeY;
            dot.vx = 0;
            dot.vy = 0;
          }
        }

        const warmth = Math.min(1, Math.hypot(dot.x - dot.homeX, dot.y - dot.homeY) / 26);
        const red = Math.round(18 + (255 - 18) * warmth);
        const green = Math.round(19 + (79 - 19) * warmth);
        const blue = Math.round(19 + (167 - 19) * warmth);
        context.fillStyle = `rgb(${red} ${green} ${blue})`;
        context.beginPath();
        context.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        context.fill();
      }

      if (!reducedMotion && (moving || ringAge < 760)) animationFrame = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(draw);
    };

    const layout = () => {
      const bounds = root.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);

      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.round(width));
      mask.height = Math.max(1, Math.round(height));
      const maskContext = mask.getContext("2d", { willReadFrequently: true });
      if (!maskContext) return;

      const typeface = '"Arial Black", "Inter", system-ui, sans-serif';
      const measureAt = 100;
      maskContext.font = `850 ${measureAt}px ${typeface}`;
      const widths = lines.map((line) => maskContext.measureText(line).width);
      const maxWidth = Math.max(1, ...widths);
      const fontSize = Math.min((width * 0.99 / maxWidth) * measureAt, height / (lines.length * 0.9));
      maskContext.font = `850 ${fontSize}px ${typeface}`;
      maskContext.textBaseline = "alphabetic";
      maskContext.fillStyle = "#000";
      const metrics = maskContext.measureText(lines[0] ?? "Kernova");
      const lineHeight = fontSize * 0.91;
      const totalHeight = lineHeight * lines.length;
      const startBaseline = (height - totalHeight) / 2 + (metrics.actualBoundingBoxAscent || fontSize * 0.76);
      lines.forEach((line, index) => maskContext.fillText(line, 0, startBaseline + index * lineHeight));

      const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
      dots.length = 0;
      const columns = Math.ceil(width / gap);
      const rows = Math.ceil(height / gap);
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          let coverage = 0;
          for (let sampleY = 0; sampleY < 3; sampleY++) {
            for (let sampleX = 0; sampleX < 3; sampleX++) {
              const x = Math.min(mask.width - 1, Math.floor(column * gap + ((sampleX + 0.5) * gap) / 3));
              const y = Math.min(mask.height - 1, Math.floor(row * gap + ((sampleY + 0.5) * gap) / 3));
              coverage += pixels[(y * mask.width + x) * 4 + 3];
            }
          }
          coverage /= 9 * 255;
          if (coverage < 0.05) continue;
          const homeX = column * gap + gap / 2;
          const homeY = row * gap + gap / 2;
          dots.push({ x: homeX, y: homeY, vx: 0, vy: 0, homeX, homeY, radius: Math.sqrt(coverage) * gap * 0.58 });
        }
      }
      wake();
    };

    const onMove = (event: PointerEvent) => {
      const bounds = root.getBoundingClientRect();
      pointerX = event.clientX - bounds.left;
      pointerY = event.clientY - bounds.top;
      wake();
    };
    const onLeave = () => { pointerX = -10000; pointerY = -10000; wake(); };
    const onPress = (event: PointerEvent) => {
      if (reducedMotion) return;
      const bounds = root.getBoundingClientRect();
      ripple = { x: event.clientX - bounds.left, y: event.clientY - bounds.top, at: performance.now() };
      wake();
    };

    layout();
    const resizeObserver = new ResizeObserver(layout);
    resizeObserver.observe(root);
    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });
    root.addEventListener("pointerdown", onPress, { passive: true });
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) layout(); });

    return () => {
      alive = false;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onPress);
    };
  }, [lineKey]);

  return <span ref={rootRef} className={`halftone-hero-text ${className}`} aria-hidden="true"><canvas ref={canvasRef}/></span>;
}

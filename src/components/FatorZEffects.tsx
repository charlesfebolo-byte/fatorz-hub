import { useEffect, useRef } from "react";

function shouldReduceMotion() {
  if (typeof window === "undefined") return true;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isTouchDevice() {
  if (typeof window === "undefined") return true;

  return window.matchMedia("(pointer: coarse)").matches;
}

export default function FatorZEffects() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".fz-reveal"));

    if (!items.length) return;

    function revealAll() {
      items.forEach((item) => item.classList.add("fz-visible"));
    }

    if (typeof IntersectionObserver === "undefined" || shouldReduceMotion()) {
      revealAll();
      return;
    }

    document.documentElement.classList.add("fz-effects-ready");

    const safetyTimeout = window.setTimeout(revealAll, 900);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("fz-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    items.forEach((item) => observer.observe(item));

    return () => {
      window.clearTimeout(safetyTimeout);
      observer.disconnect();
      revealAll();
      document.documentElement.classList.remove("fz-effects-ready");
    };
  }, []);

  useEffect(() => {
    if (isTouchDevice() || shouldReduceMotion()) return;

    let frame: number | null = null;
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    function stopAnimation() {
      if (frame === null) return;

      cancelAnimationFrame(frame);
      frame = null;
    }

    function animate() {
      currentX += (mouseX - currentX) * 0.16;
      currentY += (mouseY - currentY) * 0.16;

      const cursor = cursorRef.current;

      if (cursor) {
        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }

      frame = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (frame !== null) return;

      frame = requestAnimationFrame(animate);
    }

    function handleMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;

      mouseX = event.clientX;
      mouseY = event.clientY;

      cursorRef.current?.classList.add("is-active");
      startAnimation();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopAnimation();
        return;
      }

      if (cursorRef.current?.classList.contains("is-active")) {
        startAnimation();
      }
    }

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopAnimation();
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <div ref={cursorRef} className="fz-cursor-signal" aria-hidden="true" />;
}

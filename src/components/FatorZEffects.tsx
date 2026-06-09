import { useEffect, useRef } from "react";

export default function FatorZEffects() {
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;

    function handleMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;

      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const glow = glowRef.current;

        if (!glow) return;

        glow.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
      });
    }

    window.addEventListener("pointermove", handleMove);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleMove);
    };
  }, []);

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(".fz-reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("fz-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
      }
    );

    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return <div ref={glowRef} className="fz-cursor-glow" aria-hidden="true" />;
}
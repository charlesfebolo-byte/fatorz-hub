import { useEffect, useRef } from "react";

export default function FatorZEffects() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("fz-effects-ready");

    return () => {
      document.documentElement.classList.remove("fz-effects-ready");
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    function animate() {
      currentX += (mouseX - currentX) * 0.16;
      currentY += (mouseY - currentY) * 0.16;

      const cursor = cursorRef.current;

      if (cursor) {
        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }

      frame = requestAnimationFrame(animate);
    }

    function handleMove(event: PointerEvent) {
      if (event.pointerType === "touch") return;

      mouseX = event.clientX;
      mouseY = event.clientY;

      cursorRef.current?.classList.add("is-active");
    }

    window.addEventListener("pointermove", handleMove);
    frame = requestAnimationFrame(animate);

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
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return <div ref={cursorRef} className="fz-cursor-signal" aria-hidden="true" />;
}
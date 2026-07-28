import { useEffect, useState } from "react";

interface AnimatedSpriteProps {
  frames: string[];
  fps?: number;
  alt?: string;
  className?: string;
}

/// Cycles through pixel-art frames. With one frame it's just an <img>.
export function AnimatedSprite({ frames, fps = 6, alt = "", className }: AnimatedSpriteProps) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    // desync instances slightly so a full grid doesn't animate in lockstep
    const offset = Math.random() * (1000 / fps);
    let interval: number;
    const t = window.setTimeout(() => {
      interval = window.setInterval(() => setI((v) => (v + 1) % frames.length), 1000 / fps);
    }, offset);
    return () => {
      clearTimeout(t);
      if (interval) clearInterval(interval);
    };
  }, [frames, fps]);

  return <img src={frames[i % frames.length]} alt={alt} className={className} />;
}

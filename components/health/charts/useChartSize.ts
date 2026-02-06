import { useEffect, useRef, useState } from 'react';

export const useChartSize = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
};

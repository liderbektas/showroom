"use client";

import { useEffect, useState } from "react";

export default function HomePage() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), 350);
    return () => clearTimeout(id);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0c0e] text-[#e8eaec] flex items-center justify-center">
      show-room
    </main>
  );
}

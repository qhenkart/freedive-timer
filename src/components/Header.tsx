import Image from "next/image";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/divericon.png"
          alt="timer icon"
          width={36}
          height={36}
          priority
          className="shrink-0"
        />
        <h1
          className="text-xl sm:text-3xl font-bold tracking-tight truncate"
          style={{ color: "var(--text-primary)" }}
        >
          Freedive Timer
        </h1>
      </div>
      <ThemeToggle />
    </div>
  );
}

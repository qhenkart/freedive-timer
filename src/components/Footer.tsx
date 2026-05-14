import Image from "next/image";

export function Footer() {
  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Happy diving!
      </p>
      <div
        className="flex items-center gap-3 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <span>Made by Quest Henkart</span>
        <a
          href="https://www.instagram.com/questhenkart"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          className="opacity-70 hover:opacity-100 transition"
        >
          <Image
            src="/instagram.svg"
            alt="instagram icon"
            width={16}
            height={16}
            className="dark:invert"
          />
        </a>
        <a
          href="https://www.linkedin.com/in/questh/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="opacity-70 hover:opacity-100 transition"
        >
          <Image
            src="/linkedin.svg"
            alt="linkedin icon"
            width={16}
            height={16}
            className="dark:invert"
          />
        </a>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 py-5">
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Powered by Qloo&apos;s Taste AI —{" "}
        <a
          href="https://www.qloo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          qloo.com
        </a>
      </p>
    </footer>
  );
}

import Image from "next/image";
import { NotifyForm } from "./notify-form";
import { RevealController } from "./reveal-controller";
import { Starfield } from "./starfield";

function Divider({ className = "divider" }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <span className="divider-line" />
      <Image
        src="/images/icons/lotus-solid-icon.png"
        alt=""
        width={16}
        height={16}
        className="divider-lotus"
      />
      <span className="divider-line" />
    </div>
  );
}

export function ComingSoon() {
  return (
    <div className="page">
      <div className="bg-artwork" aria-hidden="true" />
      <Image
        src="/images/primary-bg-mask.png"
        alt=""
        width={1920}
        height={600}
        className="light-curve"
        aria-hidden="true"
        priority
      />
      <Starfield />

      <main className="content">
        <header className="brand reveal">
          <Image
            src="/images/icons/lotus-icon-colored.png"
            alt=""
            width={62}
            height={62}
            className="brand-lotus"
            priority
          />
          <h1 className="brand-name">STAVARKLING</h1>
          <p className="brand-tagline">LUXURY VISIONARY ART</p>
        </header>

        <section className="hero">
          <p className="eyebrow reveal">SOMETHING EXTRAORDINARY</p>
          <h2 className="headline reveal">
            <span>COMING</span>
            <span>SOON</span>
          </h2>

          <Divider className="divider reveal" />

          <ul className="mantra reveal">
            <li>ONE ARTWORK.</li>
            <li>ONE COLLECTOR.</li>
            <li>ONE DECISION.</li>
          </ul>
        </section>

        <NotifyForm />

        <footer className="footer reveal">
          <Divider />
          <p className="footer-text">THE EXPERIMENT BEGINS SOON.</p>
        </footer>
      </main>

      <RevealController />
    </div>
  );
}

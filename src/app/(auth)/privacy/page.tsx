import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy · Nimbus",
  description:
    "Come Nimbus usa l’account Google e, se lo chiedi, gli eventi del Calendario.",
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-2xl self-start">
      <header className="mb-8">
        <p className="font-heading text-sm font-medium text-muted-foreground">
          Nimbus
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
          Privacy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          9 ottobre 2026
        </p>
      </header>
      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Titolare</h2>
          <p>
            Nimbus è una scrivania personale di Pier Luigi Laviano. Per domande
            o per chiedere la cancellazione dei dati:{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:pjlaviano35@gmail.com"
            >
              pjlaviano35@gmail.com
            </a>
            .
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Account Google</h2>
          <p>
            Con «Continua con Google» Nimbus riceve identità, email e profilo
            (scope <span className="font-medium">openid</span>,{" "}
            <span className="font-medium">email</span> e{" "}
            <span className="font-medium">profile</span>). Salva l’email e
            l’identificativo Google dell’account, sul server, nel file degli
            utenti. La sessione dura 24 ore.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Calendario</h2>
          <p>
            Il permesso di leggere gli eventi (
            <span className="font-medium">
              calendar.events.readonly
            </span>
            ) si chiede solo quando usi «Importa call», non all’accesso. Nimbus
            legge il calendario principale da oggi ai 14 giorni successivi e
            tiene solo le call con un link Google Meet. Il token di accesso
            resta in un cookie httpOnly per circa un’ora. Non viene conservato
            un refresh token.
          </p>
          <p>
            Di ogni call che importi restano, nella tua scrivania, il titolo,
            l’orario, il link Meet e l’identificativo dell’evento. Servono a
            mostrare l’attività e a non importarla due volte.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Scrivania</h2>
          <p>
            Attività, persone, progetti e allegati stanno sul server, separati
            per account. I link a Google Drive si incollano a mano: Nimbus non
            legge la posta Gmail e non apre i file su Drive. I dati non si
            vendono e non si usano per pubblicità.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Esplorazione</h2>
          <p>
            «Esplora Nimbus» mostra dati di esempio in sola lettura. Non crea
            un account e non salva le modifiche.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Cancellazione</h2>
          <p>
            Puoi uscire dall’account in qualsiasi momento. Per eliminare
            l’account e la scrivania scrivi a{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:pjlaviano35@gmail.com"
            >
              pjlaviano35@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
      <p className="mt-10 text-sm">
        <Link href="/login" className="underline underline-offset-4">
          Torna all’accesso
        </Link>
      </p>
    </article>
  )
}

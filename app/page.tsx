export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Bienvenue sur Decido
        </h1>
        <p className="text-center text-lg mb-4">
          Votre plateforme de prise de décision collaborative
        </p>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Consensus</h2>
            <p className="text-sm">Décisions prises à l'unanimité</p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Consentement</h2>
            <p className="text-sm">Absence d'objection majeure</p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Vote Nuancé</h2>
            <p className="text-sm">Échelle de préférences</p>
          </div>
        </div>
      </div>
    </main>
  );
}

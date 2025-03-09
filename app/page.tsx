import Head from 'next/head';  // Import the Head component

export default function Home() {
  return (
    <>
      <Head>
        <link href="https://fonts.cdnfonts.com/css/neue-haas-grotesk-display-pro" rel="stylesheet" />
        <title>Home | Compensator</title>
      </Head>
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-8 row-start-2 items-center text-lg font-bold sm:items-start">
          Coming Soon
        </main>
        {/* footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
          2025 compensator.io
        </footer> */}
      </div>
    </>
  );
}

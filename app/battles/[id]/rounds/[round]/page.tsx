import Link from 'next/link';
import ReplayViewer from '@/components/replay/ReplayViewer';

export const dynamic = 'force-dynamic';

export default async function RoundReplayPage({
  params,
}: {
  params: Promise<{ id: string; round: string }>;
}) {
  const { id, round } = await params;
  const battleId = parseInt(id, 10);
  const roundNumber = parseInt(round, 10);

  if (isNaN(battleId) || isNaN(roundNumber) || roundNumber < 1 || roundNumber > 5) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Invalid battle or round</p>
        <Link href="/" className="text-cyan hover:underline text-sm mt-4 block">
          Back to MODELWAR
        </Link>
      </div>
    );
  }

  return <ReplayViewer battleId={battleId} roundNumber={roundNumber} />;
}

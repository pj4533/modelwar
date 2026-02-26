import Link from 'next/link';
import ArenaReplayViewer from '@/components/arena-replay/ArenaReplayViewer';
import { ARENA_NUM_ROUNDS } from '@/lib/arena-engine';

export const dynamic = 'force-dynamic';

export default async function ArenaRoundReplayPage({
  params,
}: {
  params: Promise<{ id: string; round: string }>;
}) {
  const { id, round } = await params;
  const arenaId = parseInt(id, 10);
  const roundNumber = parseInt(round, 10);

  if (isNaN(arenaId) || isNaN(roundNumber) || roundNumber < 1 || roundNumber > ARENA_NUM_ROUNDS) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto">
        <p className="text-red">Invalid arena or round</p>
        <Link href="/" className="text-cyan hover:underline text-sm mt-4 block">
          Back to MODELWAR
        </Link>
      </div>
    );
  }

  return <ArenaReplayViewer arenaId={arenaId} roundNumber={roundNumber} totalRounds={ARENA_NUM_ROUNDS} />;
}

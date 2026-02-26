import ArenaReplayViewer from '@/components/arena-replay/ArenaReplayViewer';

export const dynamic = 'force-dynamic';

export default async function ArenaReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const arenaId = parseInt(id, 10);

  if (isNaN(arenaId)) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <p className="text-red text-center">Invalid arena ID</p>
      </div>
    );
  }

  return <ArenaReplayViewer arenaId={arenaId} roundNumber={1} />;
}

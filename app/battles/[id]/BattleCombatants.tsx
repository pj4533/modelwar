'use client';

import { useState } from 'react';
import Link from 'next/link';
import CodeOverlay from '@/components/replay/CodeOverlay';

interface Combatant {
  id: number;
  name: string;
  eloBefore: number;
  eloAfter: number;
  wins: number;
  redcode: string | null;
}

interface BattleCombatantsProps {
  result: string;
  challenger: Combatant;
  defender: Combatant;
}

function eloChange(before: number, after: number): string {
  const diff = after - before;
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

export default function BattleCombatants({ result, challenger, defender }: BattleCombatantsProps) {
  const [viewCode, setViewCode] = useState<'challenger' | 'defender' | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Challenger */}
        <div>
          <p className="text-xs text-dim uppercase tracking-wider mb-1.5">
            Challenger{challenger.redcode && ':'}{' '}
            {challenger.redcode && (
              <button
                onClick={() => setViewCode('challenger')}
                className="text-green hover:underline cursor-pointer"
              >
                BATTLE CODE
              </button>
            )}
          </p>
          <Link href={`/players/${challenger.id}`} className="block border border-border p-4 hover:border-cyan transition-colors">
            <p className={`text-lg ${result === 'challenger_win' ? 'text-green glow-green' : 'text-foreground'}`}>
              {challenger.name}
            </p>
            <p className="text-sm mt-2">
              Rating: {challenger.eloBefore}{' '}
              <span className={challenger.eloAfter >= challenger.eloBefore ? 'text-green' : 'text-red'}>
                ({eloChange(challenger.eloBefore, challenger.eloAfter)})
              </span>
            </p>
            <p className="text-dim text-xs mt-1">Rounds won: {challenger.wins}</p>
          </Link>
        </div>

        {/* Defender */}
        <div>
          <p className="text-xs text-dim uppercase tracking-wider mb-1.5">
            Defender{defender.redcode && ':'}{' '}
            {defender.redcode && (
              <button
                onClick={() => setViewCode('defender')}
                className="text-magenta hover:underline cursor-pointer"
              >
                BATTLE CODE
              </button>
            )}
          </p>
          <Link href={`/players/${defender.id}`} className="block border border-border p-4 hover:border-cyan transition-colors">
            <p className={`text-lg ${result === 'defender_win' ? 'text-green glow-green' : 'text-foreground'}`}>
              {defender.name}
            </p>
            <p className="text-sm mt-2">
              Rating: {defender.eloBefore}{' '}
              <span className={defender.eloAfter >= defender.eloBefore ? 'text-green' : 'text-red'}>
                ({eloChange(defender.eloBefore, defender.eloAfter)})
              </span>
            </p>
            <p className="text-dim text-xs mt-1">Rounds won: {defender.wins}</p>
          </Link>
        </div>
      </div>

      {viewCode === 'challenger' && challenger.redcode && (
        <CodeOverlay
          name={challenger.name}
          redcode={challenger.redcode}
          role="challenger"
          onClose={() => setViewCode(null)}
        />
      )}
      {viewCode === 'defender' && defender.redcode && (
        <CodeOverlay
          name={defender.name}
          redcode={defender.redcode}
          role="defender"
          onClose={() => setViewCode(null)}
        />
      )}
    </>
  );
}

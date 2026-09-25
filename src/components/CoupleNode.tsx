import { Handle, Position, type NodeProps } from '@xyflow/react';
import { resolveImageUrl } from '../api/imageUrl';
import { lifeSpan } from '../utils/lifeDates';

const GENDER_COLORS: Record<string, string> = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  default: 'bg-emerald-500',
};

interface CouplePerson {
  id: string;
  name: string;
  gender: string;
  photo?: string;
  birthDate?: string | null;
  birthPrecision?: string | null;
  deathDate?: string | null;
  deathPrecision?: string | null;
}

export default function CoupleNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const person1 = (d.person1 as CouplePerson) || {};
  const person2 = (d.person2 as CouplePerson) || {};
  const color1 = GENDER_COLORS[person1.gender] || GENDER_COLORS.default;
  const color2 = GENDER_COLORS[person2.gender] || GENDER_COLORS.default;
  const dates1 = lifeSpan(person1);
  const dates2 = lifeSpan(person2);
  // A couple is one card with two halves, so each half carries its own badge
  const dead1 = !!person1.deathDate;
  const dead2 = !!person2.deathDate;
  const bothDead = dead1 && dead2;
  const onClick = d.onClick as ((personId: string) => void) | undefined;

  const Avatar = ({ person, color }: { person: CouplePerson; color: string }) => (
    <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 overflow-hidden flex-shrink-0 ${
      person.deathDate ? 'grayscale ring-gray-400' : 'ring-gray-700'
    }`}>
      {person.photo ? (
        <img src={resolveImageUrl(person.photo)} alt={person.name} className="w-full h-full object-cover" />
      ) : (
        person.name?.[0]?.toUpperCase() || '?'
      )}
    </div>
  );

  return (
    <div className="relative group">
      <Handle type="target" id="tree-top" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
      <div className={`flex items-center gap-0 w-[320px] border-2 rounded-2xl shadow-xl ${
        bothDead
          ? 'bg-[#151d2e] border-dashed border-gray-400'
          : 'bg-gray-800/80 border-emerald-600/50'
      }`}>
        <div
          data-person-id={person1.id}
          className={`flex-1 min-w-0 px-4 py-3 cursor-pointer hover:bg-gray-700/50 rounded-l-2xl transition flex items-center gap-2 ${
            dead1 ? 'bg-[#151d2e]' : ''
          }`}
          onClick={() => onClick?.(person1.id)}
        >
          <Avatar person={person1} color={color1} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${dead1 ? 'text-gray-200' : 'text-white'}`}>
              {person1.name}
              {dead1 && <span className="ml-1 text-[11px] align-middle">🕊️</span>}
            </p>
            <p className="text-gray-400 text-xs flex items-center gap-1.5 min-w-0">
              {person1.gender && <span>{person1.gender === 'male' ? '♂' : person1.gender === 'female' ? '♀' : ''}</span>}
              {dates1 && <span className="tabular-nums">{dates1}</span>}
            </p>
          </div>
        </div>

        <span className="w-6 shrink-0 flex items-center justify-center text-pink-400 text-lg select-none">❤️</span>

        <div
          data-person-id={person2.id}
          className={`flex-1 min-w-0 px-4 py-3 cursor-pointer hover:bg-gray-700/50 rounded-r-2xl transition flex items-center gap-2 ${
            dead2 ? 'bg-[#151d2e]' : ''
          }`}
          onClick={() => onClick?.(person2.id)}
        >
          <Avatar person={person2} color={color2} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${dead2 ? 'text-gray-200' : 'text-white'}`}>
              {person2.name}
              {dead2 && <span className="ml-1 text-[11px] align-middle">🕊️</span>}
            </p>
            <p className="text-gray-400 text-xs flex items-center gap-1.5 min-w-0">
              {person2.gender && <span>{person2.gender === 'male' ? '♂' : person2.gender === 'female' ? '♀' : ''}</span>}
              {dates2 && <span className="tabular-nums">{dates2}</span>}
            </p>
          </div>
        </div>
      </div>
      <Handle type="source" id="tree-bottom" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
    </div>
  );
}

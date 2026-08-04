import { Handle, Position, type NodeProps } from '@xyflow/react';
import { resolveImageUrl } from '../api/imageUrl';

const GENDER_COLORS: Record<string, string> = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  default: 'bg-emerald-500',
};

export default function CoupleNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const person1 = (d.person1 as { id: string; name: string; gender: string; photo?: string }) || {};
  const person2 = (d.person2 as { id: string; name: string; gender: string; photo?: string }) || {};
  const color1 = GENDER_COLORS[person1.gender] || GENDER_COLORS.default;
  const color2 = GENDER_COLORS[person2.gender] || GENDER_COLORS.default;
  const onClick = d.onClick as ((personId: string) => void) | undefined;

  const Avatar = ({ person, color }: { person: typeof person1; color: string }) => (
    <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-700 overflow-hidden flex-shrink-0`}>
      {person.photo ? (
        <img src={resolveImageUrl(person.photo)} alt={person.name} className="w-full h-full object-cover" />
      ) : (
        person.name?.[0]?.toUpperCase() || '?'
      )}
    </div>
  );

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
      <div className="flex items-center gap-0 bg-gray-800/80 border-2 border-emerald-600/50 rounded-2xl shadow-xl">
        <div
          className="px-4 py-3 min-w-[130px] cursor-pointer hover:bg-gray-700/50 rounded-l-2xl transition flex items-center gap-2"
          onClick={() => onClick?.(person1.id)}
        >
          <Avatar person={person1} color={color1} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{person1.name}</p>
            <p className="text-gray-400 text-xs">{person1.gender === 'male' ? '♂' : person1.gender === 'female' ? '♀' : ''}</p>
          </div>
        </div>

        <div className="text-pink-400 text-lg px-1 select-none">❤️</div>

        <div
          className="px-4 py-3 min-w-[130px] cursor-pointer hover:bg-gray-700/50 rounded-r-2xl transition flex items-center gap-2"
          onClick={() => onClick?.(person2.id)}
        >
          <Avatar person={person2} color={color2} />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{person2.name}</p>
            <p className="text-gray-400 text-xs">{person2.gender === 'male' ? '♂' : person2.gender === 'female' ? '♀' : ''}</p>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
    </div>
  );
}

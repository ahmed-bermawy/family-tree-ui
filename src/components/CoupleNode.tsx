import { Handle, Position, type NodeProps } from '@xyflow/react';

const GENDER_COLORS: Record<string, string> = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  default: 'bg-emerald-500',
};

export default function CoupleNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const person1 = (d.person1 as { id: string; name: string; gender: string }) || { name: '', gender: '' };
  const person2 = (d.person2 as { id: string; name: string; gender: string }) || { name: '', gender: '' };
  const color1 = GENDER_COLORS[person1.gender] || GENDER_COLORS.default;
  const color2 = GENDER_COLORS[person2.gender] || GENDER_COLORS.default;
  const onClick = d.onClick as ((personId: string) => void) | undefined;

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />

      <div className="flex items-center gap-0 bg-gray-800/80 border-2 border-emerald-600/50 rounded-2xl shadow-xl">
        {/* Person 1 */}
        <div
          className="px-4 py-3 min-w-[130px] cursor-pointer hover:bg-gray-700/50 rounded-l-2xl transition"
          onClick={() => onClick?.(person1.id)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 ${color1} rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-700`}>
              {person1.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{person1.name}</p>
              <p className="text-gray-400 text-xs">
                {person1.gender === 'male' ? '♂' : person1.gender === 'female' ? '♀' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Heart connector */}
        <div className="text-pink-400 text-lg px-1 select-none">❤️</div>

        {/* Person 2 */}
        <div
          className="px-4 py-3 min-w-[130px] cursor-pointer hover:bg-gray-700/50 rounded-r-2xl transition"
          onClick={() => onClick?.(person2.id)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 ${color2} rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-gray-700`}>
              {person2.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{person2.name}</p>
              <p className="text-gray-400 text-xs">
                {person2.gender === 'male' ? '♂' : person2.gender === 'female' ? '♀' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
    </div>
  );
}

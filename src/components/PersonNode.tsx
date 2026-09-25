import { Handle, Position, type NodeProps } from '@xyflow/react';
import { resolveImageUrl } from '../api/imageUrl';
import { lifeSpan } from '../utils/lifeDates';

const GENDER_COLORS: Record<string, string> = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  default: 'bg-emerald-500',
};

export default function PersonNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const name = (d.name as string) || '';
  const gender = (d.gender as string) || '';
  const photo = (d.photo as string) || '';
  const dates = lifeSpan({
    birthDate: d.birthDate as string | null,
    birthPrecision: d.birthPrecision as string | null,
    deathDate: d.deathDate as string | null,
    deathPrecision: d.deathPrecision as string | null,
  });
  const color = GENDER_COLORS[gender] || GENDER_COLORS.default;
  // Deceased = any recorded death date, even when the date itself is hidden
  const deceased = !!d.deathDate;
  const onClick = d.onClick as (() => void) | undefined;

  return (
    <div className="relative group">
      <Handle type="target" id="tree-top" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
      <div
        className={`border-2 rounded-xl px-4 py-3 w-[170px] shadow-lg transition cursor-pointer ${
          deceased
            ? 'bg-[#151d2e] border-dashed border-gray-400'
            : 'bg-gray-800 border-gray-600 hover:border-emerald-500'
        }`}
        onClick={() => onClick?.()}
      >
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 overflow-hidden flex-shrink-0 ${
            deceased ? 'grayscale ring-gray-400' : 'ring-gray-700'
          }`}>
            {photo ? (
              <img src={resolveImageUrl(photo)} alt={name} className="w-full h-full object-cover" />
            ) : (
              name[0]?.toUpperCase() || '?'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${deceased ? 'text-gray-200' : 'text-white'}`}>
              {name}
              {deceased && <span className="ml-1 text-[11px] align-middle">🕊️</span>}
            </p>
            {(gender || dates) && (
              <p className="text-gray-400 text-xs flex items-center gap-1.5 min-w-0">
                {gender && <span>{gender === 'male' ? '♂' : gender === 'female' ? '♀' : ''}</span>}
                {dates && (
                  <span className="tabular-nums">{dates}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" id="tree-bottom" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
    </div>
  );
}

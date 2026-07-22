import { Handle, Position, type NodeProps } from '@xyflow/react';

const GENDER_COLORS: Record<string, string> = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  default: 'bg-emerald-500',
};

export default function PersonNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const name = (d.name as string) || '';
  const gender = (d.gender as string) || '';
  const color = GENDER_COLORS[gender] || GENDER_COLORS.default;
  const onClick = d.onClick as (() => void) | undefined;

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
      <div
        className="bg-gray-800 border-2 border-gray-600 rounded-xl px-4 py-3 min-w-[140px] shadow-lg hover:border-emerald-500 transition cursor-pointer"
        onClick={() => onClick?.()}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white text-sm font-bold`}
          >
            {name[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{name}</p>
            {gender && (
              <p className="text-gray-400 text-xs">
                {gender === 'male' ? '♂' : gender === 'female' ? '♀' : ''}
              </p>
            )}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
    </div>
  );
}

'use client';

type Props = {
  id: string;
  emoji: string;
  label: string;
  size?: number;
};

export function ReportTypeIcon({ id, emoji, label, size = 40 }: Props) {
  return (
    <span style={{ width: size, height: size }} className="flex items-center justify-center">
      <img
        src={`/icons/reportes/${id}-sm.png`}
        alt={label}
        style={{ width: size, height: size }}
        className="object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fb = e.currentTarget.nextElementSibling as HTMLElement;
          if (fb) fb.style.display = 'inline';
        }}
      />
      <span className="hidden text-2xl">{emoji}</span>
    </span>
  );
}

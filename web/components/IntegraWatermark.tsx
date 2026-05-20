import IntegraLogo from './IntegraLogo';

interface IntegraWatermarkProps {
  href?: string;
  label?: string;
}

export default function IntegraWatermark({
  href = 'https://integra-group.ai',
  label = 'by Integra',
}: IntegraWatermarkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-50 hidden items-center gap-2 rounded-full border border-paper-300 bg-white/88 px-3 py-1.5 text-xs font-medium text-[#5a5450] backdrop-blur transition-colors hover:border-[#cdc6b9] hover:text-ink-900 sm:bottom-5 sm:right-5 sm:inline-flex"
      aria-label="Hecho por Integra Group AI"
    >
      <IntegraLogo size={18} className="text-ink-900" />
      <span>{label}</span>
      <span aria-hidden className="text-[#8c8780]">→</span>
    </a>
  );
}

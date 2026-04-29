import { TypingTest } from '@/components/assessment';

export default function TypingTestPage() {
  return (
    <div className="w-full">
      <TypingTest enableAutoSave={false} />
    </div>
  );
}

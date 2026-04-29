import TypingTest from '@/components/assessment/typing-test';

export default function TypingTestPage() {
  return (
    <div className="w-full">
      <TypingTest enableAutoSave={false} />
    </div>
  );
}

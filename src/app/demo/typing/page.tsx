import TypingTest from '@/components/assessment/typing-test';

export default function TypingTestPage() {
  return (
    <div className="w-full max-w-4xl">
      <TypingTest enableAutoSave={false} />
    </div>
  );
}

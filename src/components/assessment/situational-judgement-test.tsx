'use client';

import { useActionState, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { situationalJudgementQuestions } from '@/lib/data';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { analyzeResponseAction } from '@/app/assessment/situational-judgement/actions';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Lightbulb, Loader } from 'lucide-react';

const initialState = {
  newDifficulty: '',
  explanation: '',
};

function SubmitButton() {
  return (
    <Button type="submit" className="w-full" size="lg">
      Submit Answer
    </Button>
  );
}

export default function SituationalJudgementTest() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showAiFeedback, setShowAiFeedback] = useState(false);
  const router = useRouter();
  const [state, formAction] = useActionState(analyzeResponseAction, initialState);

  const currentQuestion = situationalJudgementQuestions[currentQuestionIndex];
  const progressPercentage =
    ((currentQuestionIndex + 1) / situationalJudgementQuestions.length) * 100;

  const handleNext = () => {
    if (showAiFeedback) {
        setShowAiFeedback(false);
    }
    if (currentQuestionIndex < situationalJudgementQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      router.push('/results?test=situational-judgement');
    }
  };
  
  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({...prev, [currentQuestion.id]: value}));
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">
          Situational Judgement Test
        </CardTitle>
        <CardDescription>
          Read each scenario carefully and select the most appropriate course of
          action.
        </CardDescription>
        <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Progress</Label>
            <Progress value={progressPercentage} className="mt-1" />
        </div>
      </CardHeader>
      <CardContent className="min-h-[20rem]">
        <h3 className="font-semibold text-lg mb-4">
          Question {currentQuestionIndex + 1}:
        </h3>
        <p className="mb-6">{currentQuestion.question}</p>

        {currentQuestion.type === 'mcq' && (
          <RadioGroup onValueChange={handleAnswerChange}>
            {currentQuestion.options?.map((option, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 rounded-md border p-4 hover:bg-muted/50 has-[[data-state=checked]]:bg-accent/30"
              >
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )}
        
        {currentQuestion.type === 'text' && 'explanation' in state && !state.explanation && (
          <form action={formAction}>
              <input type="hidden" name="question" value={currentQuestion.question} />
              <input type="hidden" name="rubric" value={currentQuestion.rubric} />
              <Textarea name="response" rows={6} placeholder="Describe your actions here..." className="mb-4" />
              <SubmitButton />
          </form>
        )}

        {'explanation' in state && state.explanation && (
            <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>AI Evaluation Feedback</AlertTitle>
                <AlertDescription>
                    <p className="font-semibold">Suggested Next Difficulty: <span className="capitalize font-normal text-primary">{state.newDifficulty}</span></p>
                    <p className="mt-2">{state.explanation}</p>
                </AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter>
        {currentQuestion.type === 'mcq' && (
             <Button onClick={handleNext} className="w-full" size="lg" disabled={!answers[currentQuestion.id]}>
             {currentQuestionIndex === situationalJudgementQuestions.length - 1
               ? 'Finish Assessment'
               : 'Next Question'}
           </Button>
        )}
        {'explanation' in state && state.explanation && (
            <Button onClick={handleNext} className="w-full" size="lg">
                 {currentQuestionIndex === situationalJudgementQuestions.length - 1
               ? 'Finish Assessment'
               : 'Next Question'}
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

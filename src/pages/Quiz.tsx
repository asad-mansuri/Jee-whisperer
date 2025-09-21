import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Beaker, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: string;
  category: string;
}

interface QuizData {
  questions: Question[];
  topic: string;
  difficulty: string;
  total: number;
}

const TOPICS = {
  science: [
    { id: 'general', name: 'General Science', icon: '🧪' },
    { id: 'physics', name: 'Physics', icon: '⚡' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪' },
    { id: 'biology', name: 'Biology', icon: '🌱' },
  ],
  math: [
    { id: 'general', name: 'General Math', icon: '📐' },
    { id: 'algebra', name: 'Algebra', icon: '🔢' },
    { id: 'geometry', name: 'Geometry', icon: '📐' },
    { id: 'statistics', name: 'Statistics', icon: '📊' },
  ]
};

const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', color: 'bg-green-500', xp: 10 },
  { id: 'medium', name: 'Medium', color: 'bg-yellow-500', xp: 15 },
  { id: 'hard', name: 'Hard', color: 'bg-red-500', xp: 20 },
];

export default function Quiz() {
  const [currentStep, setCurrentStep] = useState<'select' | 'quiz' | 'results'>('select');
  const [selectedSubject, setSelectedSubject] = useState<'science' | 'math' | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (currentStep === 'quiz' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentStep === 'quiz') {
      handleQuizComplete();
    }
  }, [timeLeft, currentStep]);

  const generateQuiz = async () => {
    if (!selectedTopic || !selectedDifficulty) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quiz-generator', {
        body: {
          topic: selectedTopic,
          difficulty: selectedDifficulty,
          amount: 10,
        },
      });

      if (error) throw error;

      setQuizData(data);
      setCurrentStep('quiz');
      setTimeLeft(300);
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate quiz. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleQuizComplete();
    }
  };

  const handleQuizComplete = async () => {
    if (!quizData) return;

    let correctAnswers = 0;
    quizData.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++;
      }
    });

    const finalScore = Math.round((correctAnswers / quizData.questions.length) * 100);
    const difficultyMultiplier = DIFFICULTIES.find(d => d.id === selectedDifficulty)?.xp || 15;
    const earnedXP = Math.round((finalScore / 100) * difficultyMultiplier * quizData.questions.length);

    setScore(finalScore);
    setXpEarned(earnedXP);

    try {
      // Save quiz result
      const { error: quizError } = await supabase
        .from('quiz_results')
        .insert({
          topic: selectedTopic,
          difficulty: selectedDifficulty,
          score: finalScore,
          total_questions: quizData.questions.length,
          xp_earned: earnedXP,
        });

      if (quizError) throw quizError;

      // Update leaderboard
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        // Update leaderboard directly
        const { data: currentData } = await supabase
          .from('leaderboard')
          .select('total_xp, weekly_xp, monthly_xp')
          .eq('user_id', userData.user.id)
          .single();

        if (currentData) {
          await supabase
            .from('leaderboard')
            .update({
              total_xp: (currentData.total_xp || 0) + earnedXP,
              weekly_xp: (currentData.weekly_xp || 0) + earnedXP,
              monthly_xp: (currentData.monthly_xp || 0) + earnedXP,
            })
            .eq('user_id', userData.user.id);
        }
      }

      toast({
        title: 'Quiz Completed!',
        description: `You scored ${finalScore}% and earned ${earnedXP} XP!`,
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
      toast({
        title: 'Error',
        description: 'Failed to save quiz result.',
        variant: 'destructive',
      });
    }

    setCurrentStep('results');
  };

  const resetQuiz = () => {
    setCurrentStep('select');
    setSelectedSubject(null);
    setSelectedTopic('');
    setSelectedDifficulty('medium');
    setQuizData(null);
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setTimeLeft(300);
    setScore(0);
    setXpEarned(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (currentStep === 'select') {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Class 10 Quiz</h1>
            <p className="text-muted-foreground">Test your knowledge and earn XP for the leaderboard!</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Select Subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant={selectedSubject === 'science' ? 'default' : 'outline'}
                  className="h-20 text-lg"
                  onClick={() => setSelectedSubject('science')}
                >
                  <Beaker className="h-6 w-6 mr-2" />
                  Science
                </Button>
                <Button
                  variant={selectedSubject === 'math' ? 'default' : 'outline'}
                  className="h-20 text-lg"
                  onClick={() => setSelectedSubject('math')}
                >
                  📐 Math
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedSubject && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Topic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TOPICS[selectedSubject].map((topic) => (
                    <Button
                      key={topic.id}
                      variant={selectedTopic === topic.id ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setSelectedTopic(topic.id)}
                    >
                      <span className="mr-2">{topic.icon}</span>
                      {topic.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTopic && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Difficulty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {DIFFICULTIES.map((diff) => (
                    <Button
                      key={diff.id}
                      variant={selectedDifficulty === diff.id ? 'default' : 'outline'}
                      onClick={() => setSelectedDifficulty(diff.id)}
                    >
                      <Badge className={`mr-2 ${diff.color}`} variant="secondary">
                        {diff.xp} XP
                      </Badge>
                      {diff.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTopic && selectedDifficulty && (
            <div className="text-center">
              <Button
                size="lg"
                onClick={generateQuiz}
                disabled={loading}
                className="px-8 py-4 text-lg"
              >
                {loading ? 'Generating Quiz...' : 'Start Quiz'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'quiz' && quizData) {
    const question = quizData.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <Badge variant="secondary" className="text-sm">
              Question {currentQuestion + 1} of {quizData.questions.length}
            </Badge>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className={timeLeft < 60 ? 'text-destructive font-bold' : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <Progress value={progress} className="mb-6" />

          <Card>
            <CardHeader>
              <CardTitle className="text-xl leading-relaxed">
                {question.question}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{question.difficulty}</Badge>
                <Badge variant="outline">{question.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswers[currentQuestion] === index ? 'default' : 'outline'}
                    className="w-full text-left justify-start p-4 h-auto"
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <span className="font-medium mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </Button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                <Button
                  onClick={nextQuestion}
                  disabled={selectedAnswers[currentQuestion] === undefined}
                >
                  {currentQuestion === quizData.questions.length - 1 ? 'Finish Quiz' : 'Next'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'results' && quizData) {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
              <CardDescription>Here are your results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-primary mb-2">{score}%</div>
                <div className="text-muted-foreground">
                  {selectedAnswers.filter((answer, index) => 
                    answer === quizData.questions[index].correctAnswer
                  ).length} out of {quizData.questions.length} correct
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span>XP Earned</span>
                  <span className="text-2xl font-bold text-accent">+{xpEarned}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Difficulty: {selectedDifficulty}</span>
                  <span>Topic: {selectedTopic}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Review Answers:</h3>
                {quizData.questions.map((question, index) => {
                  const userAnswer = selectedAnswers[index];
                  const isCorrect = userAnswer === question.correctAnswer;
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">
                          Q{index + 1}: {question.question}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Your answer: {userAnswer !== undefined ? question.options[userAnswer] : 'Not answered'}
                          {!isCorrect && (
                            <div className="text-green-600">
                              Correct: {question.options[question.correctAnswer]}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button onClick={resetQuiz} className="flex-1">
                  Take Another Quiz
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/leaderboard'}>
                  View Leaderboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
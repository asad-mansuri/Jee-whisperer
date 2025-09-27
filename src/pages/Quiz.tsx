import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Beaker, Trophy, Clock, CheckCircle, XCircle, Brain, Calculator } from 'lucide-react';

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


const SUBJECTS = [
  { id: 'physics', name: 'Physics', icon: '⚡' },
  { id: 'chemistry', name: 'Chemistry', icon: '🧪' },
  { id: 'maths', name: 'Maths', icon: '📐' },
  { id: 'all', name: 'All', icon: '📚' },
];

const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', color: 'bg-green-500', xp: 10 },
  { id: 'medium', name: 'Medium', color: 'bg-yellow-500', xp: 15 },
  { id: 'hard', name: 'Hard', color: 'bg-red-500', xp: 20 },
];

export default function Quiz() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<'select' | 'quiz' | 'results'>('select');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (currentStep === 'quiz' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentStep === 'quiz') {
      handleQuizComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, currentStep]);

  const generateQuiz = async () => {
    if (!selectedSubject || !selectedDifficulty) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quiz-generator', {
        body: {
          subject: selectedSubject,
          difficulty: selectedDifficulty,
          amount: 10,
        },
      });
      if (error) throw error;
      setQuizData(data);
      setCurrentStep('quiz');
      setTimeLeft(300);
      setSelectedAnswers(new Array(data.questions.length).fill(-1));
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
    if (!quizData || !user) return;

    let correctCount = 0;
    quizData.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / quizData.questions.length) * 100);
    const xpPerQuestion = DIFFICULTIES.find(d => d.id === selectedDifficulty)?.xp || 15;
    const earnedXP = correctCount * xpPerQuestion;

    setScore(finalScore);
    setXpEarned(earnedXP);
    setCorrectAnswers(correctCount);

    try {
      // Save quiz result to database (use `topic` column, not `subject`)
      const { data: insertData, error: quizError } = await supabase
        .from('quiz_results')
        .insert({
          user_id: user.id,
          topic: selectedSubject, // DB column is `topic`
          difficulty: selectedDifficulty,
          score: finalScore,
          total_questions: quizData.questions.length,
          xp_earned: earnedXP,
        });

      if (quizError) {
        console.error('Error saving quiz result:', quizError);
        // log any response data to help debugging
        if (insertData) console.debug('Partial insert data:', insertData);
        throw quizError;
      }

      // The leaderboard will be updated automatically via the database trigger

      toast({
        title: 'Quiz Completed!',
        description: `You scored ${finalScore}% and earned ${earnedXP} XP!`,
      });
    } catch (error) {
      console.error('Error saving quiz result:', error);
      toast({
        title: 'Error',
        description: 'Failed to save quiz result. Your progress may not be recorded.',
        variant: 'destructive',
      });
    }

    setCurrentStep('results');
  };

  const resetQuiz = () => {
    setCurrentStep('select');
    setSelectedSubject(null);
    setSelectedDifficulty('medium');
    setQuizData(null);
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setTimeLeft(300);
    setScore(0);
    setXpEarned(0);
    setCorrectAnswers(0);
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Jee exam Quiz</h1>
            <p className="text-muted-foreground">Test your knowledge and earn XP for the leaderboard!</p>
          </div>

          <Card className="mb-6 bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Select Subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUBJECTS.map((subject) => (
                  <Button
                    key={subject.id}
                    variant={selectedSubject === subject.id ? 'default' : 'outline'}
                    className="h-20 text-lg hover-lift"
                    onClick={() => setSelectedSubject(subject.id)}
                  >
                    <span className="mr-2">{subject.icon}</span>
                    {subject.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedSubject && (
            <Card className="mb-6 bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Select Difficulty</CardTitle>
                <CardDescription>Higher difficulty gives more XP per correct answer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {DIFFICULTIES.map((diff) => (
                    <Button
                      key={diff.id}
                      variant={selectedDifficulty === diff.id ? 'default' : 'outline'}
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className="hover-lift"
                    >
                      <Badge className={`mr-2 ${diff.color} text-white`} variant="secondary">
                        {diff.xp} XP
                      </Badge>
                      {diff.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedSubject && selectedDifficulty && (
            <div className="text-center">
              <Card className="bg-gradient-card shadow-card mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>5 minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>10 questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>Up to {(DIFFICULTIES.find(d => d.id === selectedDifficulty)?.xp || 15) * 10} XP</span>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={generateQuiz}
                    disabled={loading}
                    className="px-8 py-4 text-lg hover-lift"
                  >
                    {loading ? (
                      <>
                        <Brain className="h-5 w-5 mr-2 animate-pulse" />
                        Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Trophy className="h-5 w-5 mr-2" />
                        Start Quiz
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
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

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="text-xl leading-relaxed">
                {question.question}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="capitalize">{question.difficulty}</Badge>
                <Badge variant="outline">{question.category}</Badge>
                <Badge className={DIFFICULTIES.find(d => d.id === selectedDifficulty)?.color || 'bg-primary'}>
                  {DIFFICULTIES.find(d => d.id === selectedDifficulty)?.xp || 15} XP per correct answer
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswers[currentQuestion] === index ? 'default' : 'outline'}
                    className="w-full text-left justify-start p-4 h-auto hover-lift"
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <span className="font-medium mr-3 bg-muted rounded-full w-6 h-6 flex items-center justify-center text-xs">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </Button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                  disabled={currentQuestion === 0}
                  className="hover-lift"
                >
                  Previous
                </Button>
                <Button
                  onClick={nextQuestion}
                  disabled={selectedAnswers[currentQuestion] === -1}
                  className="hover-lift"
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
    const difficultyInfo = DIFFICULTIES.find(d => d.id === selectedDifficulty);
    const maxPossibleXP = difficultyInfo ? difficultyInfo.xp * quizData.questions.length : 0;

    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-card shadow-card">
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
                  {correctAnswers} out of {quizData.questions.length} correct
                </div>
              </div>

              <div className="bg-gradient-primary/10 rounded-lg p-6 border border-primary/20">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-medium">XP Earned</span>
                  <span className="text-3xl font-bold text-primary">+{xpEarned}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Difficulty:</span>
                    <span className="ml-2 font-medium capitalize">{selectedDifficulty}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">XP per question:</span>
                    <span className="ml-2 font-medium">{difficultyInfo?.xp || 15}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max possible:</span>
                    <span className="ml-2 font-medium">{maxPossibleXP} XP</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Review Answers:
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {quizData.questions.map((question, index) => {
                    const userAnswer = selectedAnswers[index];
                    const isCorrect = userAnswer === question.correctAnswer;
                    const wasAnswered = userAnswer !== -1;
                    
                    return (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1">
                            Q{index + 1}: {question.question}
                          </div>
                          <div className="text-sm space-y-1">
                            <div className={wasAnswered ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-muted-foreground'}>
                              Your answer: {wasAnswered ? question.options[userAnswer] : 'Not answered'}
                            </div>
                            {!isCorrect && (
                              <div className="text-green-600 font-medium">
                                Correct: {question.options[question.correctAnswer]}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={isCorrect ? 'default' : 'secondary'} className="text-xs">
                            {isCorrect ? `+${difficultyInfo?.xp || 15} XP` : '0 XP'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={resetQuiz} className="flex-1 hover-lift">
                  Take Another Quiz
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/leaderboard'}
                  className="hover-lift"
                >
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
import React from "react";
import { useParams, Link, useHistory } from "react-router-dom";
import { Card, CardBody, CardHeader, CardFooter, Button, Divider, Radio, RadioGroup, Textarea } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../components/layout";
import { useAuth } from "../contexts/auth-context";
import { getCourseById } from "../data/courses";
import { getChapterById, submitQuizAnswers } from "../api/courses";
import { Chapter, QuizResult } from "../types/course";

interface QuizParams {
  courseId: string;
  chapterId: string;
}

export const ChapterQuiz: React.FC = () => {
  const { courseId, chapterId } = useParams<QuizParams>();
  const { user } = useAuth();
  const history = useHistory();
  const [chapter, setChapter] = React.useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = React.useState<Record<string, string>>({});
  const [showResults, setShowResults] = React.useState(false);
  const [quizResult, setQuizResult] = React.useState<QuizResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchChapter = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const chapterData = await getChapterById(courseId, chapterId);
        setChapter(chapterData);
      } catch (err: any) {
        console.error("Failed to fetch chapter quiz:", err);
        if (err?.response?.status === 403) {
          setError("You must be enrolled in this course to access quizzes. Please enroll first.");
        } else {
          setError("Failed to load quiz. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && chapterId) {
      fetchChapter();
    }
  }, [courseId, chapterId]);

  const handleOptionSelect = (value: string) => {
    if (chapter && chapter.quiz[currentQuestionIndex]) {
      setSelectedOptions({
        ...selectedOptions,
        [chapter.quiz[currentQuestionIndex].id]: parseInt(value, 10)
      });
    }
  };

  const handleTextAnswerChange = (value: string) => {
    if (chapter && chapter.quiz[currentQuestionIndex]) {
      const questionId = chapter.quiz[currentQuestionIndex].id;
      setTextAnswers((prev) => ({
        ...prev,
        [questionId]: value
      }));
    }
  };

  const handleNextQuestion = () => {
    if (!chapter) return;
    
    if (currentQuestionIndex < chapter.quiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmitQuiz();
    }
  };

  const handleSubmitQuiz = async () => {
    if (!chapter || !user) return;
    
    try {
      setIsSubmitting(true);
      const combinedAnswers: Record<string, number | string> = {
        ...selectedOptions,
        ...textAnswers
      };
      const result = await submitQuizAnswers(courseId, chapterId, combinedAnswers);
      setQuizResult(result);
      setShowResults(true);
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const getCurrentQuestion = () => {
    if (!chapter || !chapter.quiz || chapter.quiz.length === 0) return null;
    return chapter.quiz[currentQuestionIndex];
  };

  const handleFinishQuiz = () => {
    history.push(`/courses/${courseId}`);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p>Loading quiz...</p>
        </div>
      </Layout>
    );
  }

  if (!chapter) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Icon icon="lucide:alert-circle" className="text-danger mb-4" width={48} height={48} />
          <h2 className="text-2xl font-bold mb-2">Quiz Not Found</h2>
          <p className="text-default-500 mb-6">The quiz you're looking for doesn't exist or has been removed.</p>
          <Button as={Link} to={`/courses/${courseId}`} color="primary">
            Back to Course
          </Button>
        </div>
      </Layout>
    );
  }

  const currentQuestion = getCurrentQuestion();

  if (!currentQuestion) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Icon icon="lucide:alert-circle" className="text-danger mb-4" width={48} height={48} />
          <h2 className="text-2xl font-bold mb-2">No Questions Available</h2>
          <p className="text-default-500 mb-6">This quiz doesn't have any questions yet.</p>
          <Button as={Link} to={`/courses/${courseId}`} color="primary">
            Back to Course
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            as={Link} 
            to={`/courses/${courseId}/chapters/${chapterId}`} 
            variant="light" 
            startContent={<Icon icon="lucide:arrow-left" />}
          >
            Назад к главе
          </Button>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Квиз: {chapter.title}</h1>
        <p className="text-default-500">
          Ответь на все вопросы, чтобы пройти эту главу.
        </p>
      </div>

      {showResults && quizResult ? (
        <Card disableRipple>
          <CardHeader>
            <h2 className="text-xl font-semibold">Quiz Results</h2>
          </CardHeader>
          <Divider />
          <CardBody className="flex flex-col items-center py-12">
            <div className={`
              w-32 h-32 rounded-full flex items-center justify-center mb-6
              ${quizResult.passed ? 'bg-success-100 text-success' : 'bg-danger-100 text-danger'}
            `}>
              <div className="text-center">
                <div className="text-4xl font-bold">{quizResult.score}%</div>
                <div className="text-sm">{quizResult.passed ? 'Passed' : 'Failed'}</div>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold mb-2">
              {quizResult.passed 
                ? 'Congratulations!' 
                : 'Keep practicing!'}
            </h3>
            
            <p className="text-default-500 text-center mb-6">
              {quizResult.passed 
                ? 'You have successfully completed this chapter.' 
                : 'You need to score at least 70% to pass this quiz. Try again!'}
            </p>
            
            <div className="flex gap-4">
              {!quizResult.passed && (
                <Button
                  color="primary"
                  variant="flat"
                  onPress={() => {
                    setCurrentQuestionIndex(0);
                    setSelectedOptions({});
                    setShowResults(false);
                  }}
                  startContent={<Icon icon="lucide:refresh-cw" />}
                >
                  Try Again
                </Button>
              )}
              <Button
                color="primary"
                onPress={handleFinishQuiz}
                endContent={<Icon icon="lucide:check-circle" />}
              >
                {quizResult.passed ? 'Continue to Next Chapter' : 'Return to Course'}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card disableRipple>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Вопрос {currentQuestionIndex + 1} из {chapter.quiz.length}
              </h2>
              <div className="text-default-500 text-small ml-4">
                {Math.round(((currentQuestionIndex + 1) / chapter.quiz.length) * 100)}% завершено
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="py-8">
            <h3 className="text-xl font-medium mb-6">{currentQuestion.question}</h3>
            {(() => {
              const options = currentQuestion.options || [];
              const nonEmptyOptions = options.filter(
                (option) => option && option.trim() !== ""
              );
              const isTextQuestion =
                currentQuestion.type === "text" || nonEmptyOptions.length <= 1;

              if (isTextQuestion) {
                return (
              <div className="space-y-3">
                <p className="text-default-500 text-small">
                  Это открытый вопрос. Напиши свой ответ и обсуди его с преподавателем.
                </p>
                <Textarea
                  minRows={4}
                  placeholder="Напишите здесь свой ответ (он не сохраняется автоматически)"
                  value={textAnswers[currentQuestion.id] ?? ""}
                  onChange={(e) => handleTextAnswerChange(e.target.value)}
                />
              </div>
                );
              }

              return (
                <RadioGroup
                value={selectedOptions[currentQuestion.id]?.toString() || ""}
                onValueChange={handleOptionSelect}
                className="space-y-3"
              >
                {currentQuestion.options.map((option: string, index: number) => (
                  <Radio key={index} value={index.toString()}>
                    {option}
                  </Radio>
                ))}
              </RadioGroup>
              );
            })()}
          </CardBody>
          <Divider />
          <CardFooter className="flex justify-between">
            <Button
              variant="flat"
              startContent={<Icon icon="lucide:arrow-left" />}
              onPress={handlePreviousQuestion}
              isDisabled={currentQuestionIndex === 0}
            >
              Назад
            </Button>
            <Button
              color="primary"
              endContent={
                currentQuestionIndex < chapter.quiz.length - 1 
                  ? <Icon icon="lucide:arrow-right" /> 
                  : <Icon icon="lucide:check-circle" />
              }
              onPress={handleNextQuestion}
              isDisabled={
                ((!currentQuestion.type || currentQuestion.type === "choice") &&
                  selectedOptions[currentQuestion.id] === undefined) ||
                (currentQuestion.type === "text" &&
                  (!textAnswers[currentQuestion.id] || textAnswers[currentQuestion.id].trim() === ""))
              }
            >
              {currentQuestionIndex < chapter.quiz.length - 1 ? "Далее" : "Завершить квиз"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </Layout>
  );
};

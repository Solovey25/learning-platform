import React from "react";
import { useParams, Link, useHistory } from "react-router-dom";
import { Card, CardBody, CardHeader, CardFooter, Button, Divider, Progress } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../components/layout";
import { useAuth } from "../contexts/auth-context";
import { getCourseById, getChapterById, markChapterCompleted } from "../api/courses";
import { Course, Chapter } from "../types/course";

interface ChapterParams {
  courseId: string;
  chapterId: string;
}

export const ChapterContent: React.FC = () => {
  const { courseId, chapterId } = useParams<ChapterParams>();
  const { user } = useAuth();
  const history = useHistory();
  const [course, setCourse] = React.useState<Course | null>(null);
  const [chapter, setChapter] = React.useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchChapter = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const chapterData = await getChapterById(courseId, chapterId);
        setChapter(chapterData);

        const courseData = await getCourseById(courseId);
        setCourse(courseData);
        
        const chapterIndex = courseData.chapters.findIndex((ch: any) => ch.id === chapterId);
        setCurrentChapterIndex(chapterIndex !== -1 ? chapterIndex : 0);
      } catch (err: any) {
        console.error("Failed to fetch chapter:", err);
        if (err?.response?.status === 403) {
          setError("You must be enrolled in this course to access chapters. Please enroll first.");
        } else {
          setError("Failed to load chapter content. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && chapterId) {
      fetchChapter();
    }
  }, [courseId, chapterId]);

  const handleCompleteChapter = async () => {
    if (!user || !course || !chapter) return;
    
    try {
      setIsSubmitting(true);
      await markChapterCompleted(courseId, chapterId);
      history.push(`/courses/${courseId}/chapters/${chapterId}/quiz`);
    } catch (err) {
      console.error("Failed to mark chapter as completed:", err);
      alert("Failed to mark chapter as completed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      const previousChapter = course?.chapters[currentChapterIndex - 1];
      history.push(`/courses/${courseId}/chapters/${previousChapter.id}`);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p>Loading chapter content...</p>
        </div>
      </Layout>
    );
  }

  if (!course || !chapter) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Icon icon="lucide:alert-circle" className="text-danger mb-4" width={48} height={48} />
          <h2 className="text-2xl font-bold mb-2">Chapter Not Found</h2>
          <p className="text-default-500 mb-6">The chapter you're looking for doesn't exist or has been removed.</p>
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
            to={`/courses/${courseId}`} 
            variant="light" 
            startContent={<Icon icon="lucide:arrow-left" />}
          >
            Back to Course
          </Button>
        </div>
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{chapter.title}</h1>
          <div className="text-default-500">
            Chapter {currentChapterIndex + 1} of {course.chapters.length}
          </div>
        </div>
        
        <Progress 
          aria-label="Прогресс по главе" 
          value={((currentChapterIndex + 1) / course.chapters.length) * 100} 
          color="primary"
          className="h-1 mt-2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card disableRipple>
            <CardBody>
              <div 
                className="course-content prose max-w-none"
                dangerouslySetInnerHTML={{ __html: chapter.content }}
              />
            </CardBody>
            <Divider />
            <CardFooter className="flex justify-between">
              <Button
                variant="flat"
                startContent={<Icon icon="lucide:arrow-left" />}
                onPress={navigateToPreviousChapter}
                isDisabled={currentChapterIndex === 0}
              >
                Назад
              </Button>
              <Button
                color="primary"
                endContent={<Icon icon="lucide:check-circle" />}
                onPress={handleCompleteChapter}
              >
                Отметить как пройденную и перейти к квизу
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="sticky top-4" disableRipple>
            <CardHeader>
              <h3 className="text-lg font-semibold">Навигация по главам</h3>
            </CardHeader>
            <Divider />
            <CardBody className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {course.chapters.map((ch: any, index: number) => (
                  <Link
                    key={ch.id}
                    to={`/courses/${courseId}/chapters/${ch.id}`}
                    className={`
                      flex items-center p-3 border-b border-divider last:border-0
                      ${ch.id === chapterId ? 'bg-primary-50 text-primary' : 'hover:bg-default-50'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs
                        ${ch.id === chapterId ? 'bg-primary text-white' : 'bg-default-100 text-default-700'}
                      `}>
                        {index + 1}
                      </div>
                      <span>{ch.title}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardBody>
            <Divider />
            <CardFooter>
                <Button
                as={Link}
                to={`/courses/${courseId}/chapters/${chapterId}/quiz`}
                color="secondary"
                variant="flat"
                fullWidth
                startContent={<Icon icon="lucide:check-circle" />}
              >
                Пройти квиз
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

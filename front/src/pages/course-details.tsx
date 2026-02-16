import React from "react";
import { useParams, Link, useHistory } from "react-router-dom";
import { Card, CardBody, CardHeader, Button, Progress, Divider, Chip, Accordion, AccordionItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../components/layout";
import { useAuth } from "../contexts/auth-context";
import { getCourseById, participateInCourse } from "../api/courses";
import { Course } from "../types/course";
import { EnrollmentModal } from "../components/enrollment-modal";
import type { AssignmentShort, MyAssignmentWork } from "../api/assignments";
import { getCourseAssignmentsForUser, getMyAssignments } from "../api/assignments";

interface CourseParams {
  courseId: string;
}

export const CourseDetails: React.FC = () => {
  const { courseId } = useParams<CourseParams>();
  const { user } = useAuth();
  const history = useHistory();
  const [course, setCourse] = React.useState<Course | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = React.useState(false);
  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [enrollmentError, setEnrollmentError] = React.useState<string | null>(null);
  const [assignments, setAssignments] = React.useState<AssignmentShort[]>([]);
  const [myAssignments, setMyAssignments] = React.useState<MyAssignmentWork[]>([]);

  React.useEffect(() => {
    const fetchCourse = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const courseData = await getCourseById(courseId);
        setCourse(courseData);

        try {
          const assignmentsData = await getCourseAssignmentsForUser(courseId);
          setAssignments(assignmentsData);
        } catch (assignmentsError) {
          console.error("Failed to load assignments for course:", assignmentsError);
        }

        try {
          const myAssignmentsResponse = await getMyAssignments();
          setMyAssignments(myAssignmentsResponse.items);
        } catch (myAssignmentsError) {
          console.error("Failed to load my assignments for status:", myAssignmentsError);
        }
      } catch (err: any) {
        console.error("Failed to fetch course:", err);
        if (err?.response?.status === 403) {
          setError("You must be enrolled in this course to view it.");
        } else {
          setError("Failed to load course details. Please try again later.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const handleStartCourse = () => {
    if (course?.enrolled) {
      const firstChapter = course.chapters.find((ch: any) => !ch.completed) || course.chapters[0];
      if (firstChapter) {
        history.push(`/courses/${courseId}/chapters/${firstChapter.id}`);
      }
    } else {
      setIsEnrollmentModalOpen(true);
      setEnrollmentError(null);
    }
  };

  const handleEnroll = async (enrollmentCode: string) => {
    if (!courseId) return;
    
    try {
      setIsEnrolling(true);
      setEnrollmentError(null);
      await participateInCourse(courseId, enrollmentCode);

      const courseData = await getCourseById(courseId);
      setCourse(courseData);

      setIsEnrollmentModalOpen(false);

      const firstChapter = courseData.chapters[0];
      if (firstChapter) {
        history.push(`/courses/${courseId}/chapters/${firstChapter.id}`);
      }
    } catch (err: any) {
      console.error("Failed to join course:", err);
      if (err?.response?.status === 400) {
        setEnrollmentError("Неверный код доступа. Проверь его и попробуй ещё раз.");
      } else {
        setEnrollmentError("Не удалось присоединиться к курсу. Попробуй позже.");
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p>Loading course details...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Icon icon="lucide:alert-circle" className="text-danger mb-4" width={48} height={48} />
          <h2 className="text-2xl font-bold mb-2">Error Loading Course</h2>
          <p className="text-default-500 mb-6">{error}</p>
          <Button as={Link} to="/dashboard" color="primary">
            Назад к дашборду
          </Button>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Icon icon="lucide:alert-circle" className="text-danger mb-4" width={48} height={48} />
          <h2 className="text-2xl font-bold mb-2">Курс не найден</h2>
          <p className="text-default-500 mb-6">Курс не существует или был удалён.</p>
          <Button as={Link} to="/dashboard" color="primary">
            Назад к дашборду
          </Button>
        </div>
      </Layout>
    );
  }

  const FALLBACK_IMAGE = "https://www.svgrepo.com/show/303548/git-icon-logo.svg";

  const courseLevelAssignments = assignments.filter(
    (assignment) => !assignment.chapterId
  );
  const totalAssignmentsCount = assignments.length;
  const totalQuizzesCount = course.chapters.reduce(
    (total, chapter: any) => total + (Array.isArray(chapter.quiz) ? chapter.quiz.length : 0),
    0
  );
  const fallbackEstimatedMinutes = course.chapters.length * 30;

  const getAssignmentStatus = (assignmentId: string) => {
    const item = myAssignments.find((work) => work.assignmentId === assignmentId);
    if (!item || !item.latestSubmissionId) {
      return { label: "Не сдано", color: "danger" as const };
    }
    if (item.grade != null) {
      return { label: "Проверено", color: "success" as const };
    }
    return { label: "На проверке", color: "warning" as const };
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
            <p className="text-default-500">{course.description}</p>
          </div>

          {courseLevelAssignments.length > 0 && (
            <Card className="mb-6" disableRipple>
              <CardHeader>
                <h2 className="text-xl font-semibold">Задания по курсу</h2>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-3">
                <p className="text-default-500 text-sm">
                  Эти задания относятся ко всему курсу. Выполняй их вместе с командой по мере прохождения глав.
                </p>
                <div className="space-y-2">
                  {courseLevelAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-3 rounded-medium border border-default-100 bg-default-50 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {assignment.title}
                        </span>
                        {assignment.dueDate && (
                          <span className="text-xs text-default-500">
                            Дедлайн:{" "}
                            {new Date(
                              assignment.dueDate
                            ).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getAssignmentStatus(assignment.id).color}
                        >
                          {getAssignmentStatus(assignment.id).label}
                        </Chip>
                        <Button
                          as={Link}
                          to={`/assignments/${assignment.id}`}
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={
                            <Icon
                              icon="lucide:edit-3"
                              width={16}
                              height={16}
                            />
                          }
                        >
                          Открыть
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="mb-6" disableRipple>
            <CardHeader>
              <h2 className="text-xl font-semibold">Содержание курса</h2>
            </CardHeader>
            <Divider />
            <CardBody>
              <Accordion selectionMode="multiple" defaultSelectedKeys={["1"]}>
                {course.chapters.map((chapter: any, index: number) => {
                  const chapterAssignments = assignments.filter(
                    (assignment) => assignment.chapterId === chapter.id
                  );
                  return (
                  <AccordionItem
                    key={chapter.id}
                    textValue={chapter.title}
                    title={
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-default-500">Глава {index + 1}:</span>
                          <span>{chapter.title}</span>
                        </div>
                        {chapter.completed && (
                          <Chip color="success" variant="flat" size="sm">
                            Пройдено
                          </Chip>
                        )}
                      </div>
                    }
                  >
                    <div className="py-2 space-y-4">
                      <p className="text-default-500">
                        В этой главе рассматривается тема «{chapter.title}» и есть квиз для проверки знаний.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {course.enrolled ? (
                          <>
                            <Button
                              as={Link}
                              to={`/courses/${courseId}/chapters/${chapter.id}`}
                              color="primary"
                              variant="flat"
                              size="sm"
                              startContent={<Icon icon="lucide:book-open" />}
                            >
                              Перейти к главе
                            </Button>
                            <Button
                              as={Link}
                              to={`/courses/${courseId}/chapters/${chapter.id}/quiz`}
                              color="secondary"
                              variant="flat"
                              size="sm"
                              startContent={<Icon icon="lucide:check-circle" />}
                            >
                              Пройти квиз
                            </Button>
                          </>
                        ) : (
                          <p className="text-default-500 text-sm">
                            Запишись на курс, чтобы получить доступ к главам.
                          </p>
                        )}
                      </div>
                      {chapterAssignments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs font-semibold text-default-500">
                            Задания для этой главы
                          </p>
                          {chapterAssignments.map((assignment) => {
                            const status = getAssignmentStatus(assignment.id);
                            return (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <Button
                                  as={Link}
                                  to={`/assignments/${assignment.id}`}
                                  size="sm"
                                  variant="light"
                                  startContent={
                                    <Icon
                                      icon="lucide:clipboard-list"
                                      width={16}
                                      height={16}
                                    />
                                  }
                                >
                                  {assignment.title}
                                </Button>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={status.color}
                                >
                                  {status.label}
                                </Chip>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </AccordionItem>
                );
                })}
              </Accordion>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-4" disableRipple>
            <CardBody>
              <div className="aspect-video mb-4 overflow-hidden rounded-medium">
                <img 
                  src={course.imageUrl || FALLBACK_IMAGE} 
                  alt={course.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== FALLBACK_IMAGE) {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }
                  }}
                />
              </div>
              
              {course.enrolled && typeof course.progress === 'number' && (
                <div className="mb-6">
                  <div className="flex justify-between text-small mb-1">
                    <p>Твой прогресс</p>
                    <p>{course.progress}%</p>
                  </div>
                  <Progress
                    aria-label="Course progress"
                    value={course.progress}
                    color="primary"
                    className="h-2"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:book" className="text-primary" />
                  <span>{course.chapters.length} глав</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:check-circle" className="text-primary" />
                  <span>{totalQuizzesCount} квизов</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:clipboard-list" className="text-primary" />
                  <span>{totalAssignmentsCount} заданий</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="lucide:clock" className="text-primary" />
                  <span>
                    Примерно{" "}
                    {course.estimatedMinutes != null
                      ? course.estimatedMinutes
                      : fallbackEstimatedMinutes}{" "}
                    мин
                  </span>
                </div>
              </div>
              
              <Divider className="my-6" />
              
              <Button
                color="primary"
                fullWidth
                size="lg"
                onPress={handleStartCourse}
                startContent={<Icon icon={course.enrolled ? "lucide:play" : "lucide:book-open"} />}
              >
                {course.enrolled ? "Продолжить обучение" : "Начать курс"}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <EnrollmentModal
        isOpen={isEnrollmentModalOpen}
        onClose={() => {
          setIsEnrollmentModalOpen(false);
          setEnrollmentError(null);
        }}
        onEnroll={handleEnroll}
        isLoading={isEnrolling}
        error={enrollmentError}
      />
    </Layout>
  );
};

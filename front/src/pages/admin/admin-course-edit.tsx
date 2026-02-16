import React from "react";
import { useParams, useHistory } from "react-router-dom";
import { Card, CardBody, CardHeader, CardFooter, Button, Input, Textarea, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import { getCourseById, updateCourse as apiUpdateCourse, enrollUserToCourse } from "../../api/courses";
import { ChapterForm } from "../../components/chapter-form";
import { Course } from "../../types/course";

interface CourseParams {
  courseId: string;
}

interface ChapterFormData {
  id?: string;
  title: string;
  content: string;
  quiz: {
    id?: string;
    question: string;
    options: string[];
    correctOption: number;
    type?: "choice" | "text";
  }[];
}

export const AdminCourseEdit: React.FC = () => {
  const { courseId } = useParams<CourseParams>();
  const history = useHistory();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [courseData, setCourseData] = React.useState({
    title: "",
    description: "",
    imageUrl: "",
    estimatedMinutes: "",
  });
  const [chapters, setChapters] = React.useState<ChapterFormData[]>([]);
  const [enrollEmail, setEnrollEmail] = React.useState("");
  const [isEnrolling, setIsEnrolling] = React.useState(false);
  const [enrollError, setEnrollError] = React.useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadCourse = async () => {
      try {
        setIsLoading(true);
        const course = await getCourseById(courseId);
        
        if (course) {
          setCourseData({
            title: course.title,
            description: course.description,
            imageUrl: course.imageUrl,
            estimatedMinutes:
              course.estimatedMinutes != null ? String(course.estimatedMinutes) : "",
          });
          
          setChapters(course.chapters.map(chapter => ({
            id: chapter.id,
            title: chapter.title,
            content: chapter.content,
            quiz: chapter.quiz.map(q => ({
              id: q.id,
              question: q.question,
              options: q.options,
              correctOption: q.correctOption,
              type: q.type || "choice",
            }))
          })));
        }
      } catch (err) {
        console.error("Failed to load course:", err);
        alert("Не удалось загрузить данные курса. Попробуй ещё раз.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCourse();
  }, [courseId]);

  const handleCourseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCourseData({
      ...courseData,
      [name]: value
    });
  };

  const handleAddChapter = () => {
    setChapters([
      ...chapters,
      {
        title: "",
        content: "",
        quiz: [
          {
            question: "",
            options: ["", "", "", ""],
                correctOption: 0,
                type: "choice",
          }
        ]
      }
    ]);
  };

  const handleChapterChange = (index: number, updatedChapter: ChapterFormData) => {
    const updatedChapters = [...chapters];
    updatedChapters[index] = updatedChapter;
    setChapters(updatedChapters);
  };

  const handleRemoveChapter = (index: number) => {
    if (chapters.length > 1) {
      const updatedChapters = [...chapters];
      updatedChapters.splice(index, 1);
      setChapters(updatedChapters);
    }
  };

  const handleEnrollUser = async () => {
    const email = enrollEmail.trim();
    if (!email) {
      setEnrollError("Укажи email пользователя");
      setEnrollSuccess(null);
      return;
    }

    try {
      setIsEnrolling(true);
      setEnrollError(null);
      setEnrollSuccess(null);

      const result = await enrollUserToCourse(courseId, email);
      setEnrollSuccess(result.message || "Пользователь добавлен на курс");
      setEnrollEmail("");
    } catch (err: any) {
      const backendMessage = err?.response?.data?.detail;
      const fallbackMessage = err?.message;
      setEnrollError(
        backendMessage ||
          fallbackMessage ||
          "Не удалось добавить пользователя на курс"
      );
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!courseData.title || !courseData.description) {
        alert("Заполни все поля курса");
        setIsSubmitting(false);
        return;
      }

      for (const chapter of chapters) {
        if (!chapter.title || !chapter.content) {
          alert("Заполни все поля глав курса");
          setIsSubmitting(false);
          return;
        }

        for (const quiz of chapter.quiz) {
          const quizType = quiz.type || "choice";

          if (!quiz.question) {
            alert("Заполни все поля вопросов квиза");
            setIsSubmitting(false);
            return;
          }

          if (quizType === "text") {
            if (!quiz.options[0] || quiz.options[0].trim() === "") {
              alert("Заполни правильный ответ для вопросов со свободным ответом");
              setIsSubmitting(false);
              return;
            }
          } else if (quiz.options.some(option => !option)) {
            alert("Заполни все поля вопросов квиза");
            setIsSubmitting(false);
            return;
          }
        }
      }

      const estimatedMinutes =
        courseData.estimatedMinutes.trim() === ""
          ? undefined
          : Number(courseData.estimatedMinutes.trim());

      await apiUpdateCourse(courseId, {
        title: courseData.title,
        description: courseData.description,
        imageUrl: courseData.imageUrl,
        estimatedMinutes,
        chapters: chapters.map((chapter, index) => ({
          ...chapter,
          id: chapter.id || `${courseId}-${index + 1}`,
          quiz: chapter.quiz.map((quiz, qIndex) => ({
            ...quiz,
            id: quiz.id || `${courseId}-${index + 1}-${qIndex + 1}`
          }))
        }))
      });

      history.push("/admin");
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Произошла ошибка при сохранении курса");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p>Загрузка данных курса...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button 
            as="a" 
            href="/admin" 
            variant="light" 
            startContent={<Icon icon="lucide:arrow-left" />}
          >
            Назад к админке
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">Редактирование курса</h1>
        <p className="text-default-500">Обнови информацию о курсе и содержимое глав</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-8" disableRipple>
          <CardHeader>
            <h2 className="text-xl font-semibold">Информация о курсе</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-6">
            <Input
              label="Название курса"
              name="title"
              value={courseData.title}
              onChange={handleCourseInputChange}
              placeholder="Введите название курса"
              isRequired
            />
            <Textarea
              label="Описание курса"
              name="description"
              value={courseData.description}
              onChange={handleCourseInputChange}
              placeholder="Расскажи, чему научится студент и для кого курс"
              minRows={3}
              isRequired
            />
            <Input
              label="Ссылка на обложку курса"
              name="imageUrl"
              value={courseData.imageUrl}
              onChange={handleCourseInputChange}
              placeholder="Вставь URL картинки для обложки курса"
              isRequired
            />
            <Input
              type="number"
              label="Примерное время на курс (минуты)"
              name="estimatedMinutes"
              value={courseData.estimatedMinutes}
              onChange={handleCourseInputChange}
              placeholder="Например, 180"
              min={0}
            />
            {courseData.imageUrl && (
              <div className="mt-2">
                <p className="text-small text-default-500 mb-2">Предпросмотр:</p>
                <img
                  src={courseData.imageUrl}
                  alt="Обложка курса"
                  className="w-full max-w-md h-48 object-cover rounded-medium"
                />
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="mb-8" disableRipple>
          <CardHeader>
            <h2 className="text-xl font-semibold">Участники курса</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            {enrollError && (
              <p className="text-sm text-danger-500">{enrollError}</p>
            )}
            {enrollSuccess && (
              <p className="text-sm text-success-500">{enrollSuccess}</p>
            )}
            <Input
              type="email"
              label="Добавить пользователя по email"
              placeholder="user@example.com"
              value={enrollEmail}
              onChange={(e) => setEnrollEmail(e.target.value)}
            />
            <p className="text-xs text-default-500">
              Пользователь должен быть уже зарегистрирован на платформе. Если
              он не найден, появится сообщение об ошибке.
            </p>
          </CardBody>
          <CardFooter className="flex justify-end">
            <Button
              color="primary"
              variant="flat"
              isLoading={isEnrolling}
              onPress={handleEnrollUser}
            >
              Добавить на курс
            </Button>
          </CardFooter>
        </Card>

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Главы</h2>
          <Button
            color="primary"
            variant="flat"
            startContent={<Icon icon="lucide:plus" />}
            onPress={handleAddChapter}
          >
            Добавить главу
          </Button>
        </div>

        {chapters.map((chapter, index) => (
          <ChapterForm
            key={index}
            chapter={chapter}
            index={index}
            onChange={handleChapterChange}
            onRemove={handleRemoveChapter}
            showRemoveButton={chapters.length > 1}
          />
        ))}

        <div className="mt-8 flex justify-end gap-3">
          <Button
            variant="flat"
            color="danger"
            onPress={() => history.push("/admin")}
          >
            Отменить
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={isSubmitting}
          >
            Сохранить изменения
          </Button>
        </div>
      </form>
    </Layout>
  );
};

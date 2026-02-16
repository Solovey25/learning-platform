import React from "react";
import { useHistory } from "react-router-dom";
import { Card, CardBody, CardHeader, CardFooter, Button, Input, Textarea, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import { addCourse } from "../../data/courses";
import { ChapterForm } from "../../components/chapter-form";
import { createCourse } from "../../api/courses";
import { Course } from "../../types/course";

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

export const AdminCourseCreate: React.FC = () => {
  const history = useHistory();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [courseData, setCourseData] = React.useState({
    title: "",
    description: "",
    imageUrl: "https://img.heroui.chat/image/ai?w=800&h=400&u=course" + Date.now(),
    estimatedMinutes: "",
  });
  const [chapters, setChapters] = React.useState<ChapterFormData[]>([
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
            correctOption: 0
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
          alert("Заполни все поля глав");
          setIsSubmitting(false);
          return;
        }

        for (const quiz of chapter.quiz) {
          const quizType = quiz.type || "choice";

          if (!quiz.question) {
            alert("Заполни все поля квизов");
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
            alert("Заполни все поля квизов");
            setIsSubmitting(false);
            return;
          }
        }
      }

      const estimatedMinutes =
        courseData.estimatedMinutes.trim() === ""
          ? undefined
          : Number(courseData.estimatedMinutes.trim());

      await createCourse({
        title: courseData.title,
        description: courseData.description,
        imageUrl: courseData.imageUrl,
        estimatedMinutes,
        chapters: chapters.map((chapter, index) => ({
          ...chapter,
          id: `new-${index + 1}`,
          quiz: chapter.quiz.map((quiz, qIndex) => ({
            ...quiz,
            id: `new-${index + 1}-${qIndex + 1}`
          }))
        }))
      });

      history.push("/admin");
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Произошла ошибка при создании курса");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Назад в админ‑панель
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-2">Создание нового курса</h1>
        <p className="text-default-500">Заполни данные, чтобы создать новый курс</p>
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
              placeholder="Кратко опишите курс"
              minRows={3}
              isRequired
            />
            <Input
              label="URL изображения курса"
              name="imageUrl"
              value={courseData.imageUrl}
              onChange={handleCourseInputChange}
              placeholder="Вставьте ссылку на изображение"
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
                <p className="text-small text-default-500 mb-2">Превью:</p>
                <img
                  src={courseData.imageUrl}
                  alt="Course preview"
                  className="w-full max-w-md h-48 object-cover rounded-medium"
                />
              </div>
            )}
          </CardBody>
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
            Отмена
          </Button>
          <Button
            type="submit"
            color="primary"
            isLoading={isSubmitting}
          >
            Создать курс
          </Button>
        </div>
      </form>
    </Layout>
  );
};

import React from "react";
import { useParams, Link, useHistory } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Textarea,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import { getCourseById } from "../../api/courses";
import {
  AssignmentShort,
  AssignmentDetail,
  getCourseAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../../api/assignments";
import { Course } from "../../types/course";

interface RouteParams {
  courseId: string;
}

export const AdminCourseAssignments: React.FC = () => {
  const { courseId } = useParams<RouteParams>();
  const history = useHistory();

  const [course, setCourse] = React.useState<Course | null>(null);
  const [assignments, setAssignments] = React.useState<AssignmentShort[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [chapterId, setChapterId] = React.useState<string>("course");

  const [editing, setEditing] = React.useState<AssignmentDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [courseData, assignmentsData] = await Promise.all([
          getCourseById(courseId),
          getCourseAssignments(courseId),
        ]);

        setCourse(courseData);
        setAssignments(assignmentsData);
      } catch (err) {
        console.error("Failed to load assignments:", err);
        setError("Не удалось загрузить задания курса. Попробуй позже.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setChapterId("course");
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        chapterId:
          chapterId === "course" || chapterId === ""
            ? null
            : chapterId,
      };

      if (editing) {
        const updated = await updateAssignment(editing.id, payload);
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === updated.id
              ? {
                  id: updated.id,
                  courseId: updated.courseId,
                  chapterId: updated.chapterId,
                  title: updated.title,
                  dueDate: updated.dueDate || null,
                  createdAt: updated.createdAt,
                }
              : a
          )
        );
      } else {
        const created = await createAssignment(courseId, payload);
        setAssignments((prev) => [
          ...prev,
          {
            id: created.id,
            courseId: created.courseId,
            chapterId: created.chapterId,
            title: created.title,
            dueDate: created.dueDate || null,
            createdAt: created.createdAt,
          },
        ]);
      }

      resetForm();
    } catch (err) {
      console.error("Failed to save assignment:", err);
      setError("Не удалось сохранить задание. Попробуй ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assignment: AssignmentShort) => {
    setEditing({
      id: assignment.id,
      courseId: assignment.courseId,
      chapterId: assignment.chapterId || null,
      title: assignment.title,
      description: "",
      dueDate: assignment.dueDate || null,
      createdAt: assignment.createdAt,
      updatedAt: null,
    });
    setTitle(assignment.title);
    setDescription("");
    setChapterId(assignment.chapterId || "course");
    setDueDate(
      assignment.dueDate
        ? assignment.dueDate.slice(0, 16)
        : ""
    );
  };

  const handleDelete = async (assignmentId: string) => {
    if (!window.confirm("Удалить это задание? Действие нельзя отменить.")) {
      return;
    }
    try {
      await deleteAssignment(assignmentId);
      setAssignments((prev) =>
        prev.filter((a) => a.id !== assignmentId)
      );
      if (editing?.id === assignmentId) {
        resetForm();
      }
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      setError("Не удалось удалить задание. Попробуй ещё раз.");
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleString();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            type="button"
            onClick={() => history.push("/admin")}
            className="mb-2 inline-flex items-center text-sm text-default-500 hover:text-default-700"
          >
            <Icon
              icon="lucide:arrow-left"
              className="mr-1 h-4 w-4"
            />
            Назад к курсам
          </button>
          <h1 className="text-2xl font-semibold">
            Задания курса
          </h1>
          {course && (
            <p className="text-default-500">
              {course.title}
            </p>
          )}
        </div>
        <Button
          as={Link}
          to={`/courses/${courseId}`}
          variant="flat"
          color="primary"
          startContent={<Icon icon="lucide:eye" />}
        >
          Просмотреть курс как студент
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border border-danger-500 bg-danger-50">
          <CardBody>
            <p className="text-sm text-danger-700">{error}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              Список заданий
            </h2>
          </CardHeader>
          <Divider />
          <CardBody>
            {isLoading ? (
              <p>Загрузка...</p>
            ) : assignments.length === 0 ? (
              <p className="text-default-500 text-sm">
                Пока нет заданий для этого курса.
              </p>
            ) : (
              <Table
                removeWrapper
                aria-label="Assignments table"
              >
                <TableHeader>
                  <TableColumn>Название</TableColumn>
                  <TableColumn>Глава</TableColumn>
                  <TableColumn>Дедлайн</TableColumn>
                  <TableColumn>Действия</TableColumn>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.title}</TableCell>
                      <TableCell>
                        {assignment.chapterId
                          ? course?.chapters.find(
                              (ch) =>
                                ch.id === assignment.chapterId
                            )?.title || "Глава"
                          : "Для всего курса"}
                      </TableCell>
                      <TableCell>
                        {formatDate(assignment.dueDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            as={Link}
                            to={`/admin/assignments/${assignment.id}/submissions`}
                            size="sm"
                            variant="flat"
                            color="secondary"
                            startContent={
                              <Icon
                                icon="lucide:list-checks"
                                width={16}
                                height={16}
                              />
                            }
                          >
                            Работы
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            onPress={() =>
                              handleEdit(assignment)
                            }
                          >
                            Редактировать
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() =>
                              handleDelete(assignment.id)
                            }
                          >
                            Удалить
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              {editing ? "Редактирование задания" : "Новое задание"}
            </h2>
          </CardHeader>
          <Divider />
          <form onSubmit={handleSubmit}>
            <CardBody className="space-y-4">
              <Input
                label="Название задания"
                placeholder="Например: Командный проект по главе 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                isRequired
              />
              <Textarea
                label="Описание"
                placeholder="Опиши задачу для команды: что нужно сделать, куда отправить результат и что будет критерием успешности."
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                minRows={4}
                isRequired
              />
              <Select
                label="Привязка к главе"
                selectedKeys={[chapterId]}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as string;
                  setChapterId(key);
                }}
              >
                <SelectItem key="course">
                  Для всего курса
                </SelectItem>
                {course?.chapters.map((chapter) => (
                  <SelectItem key={chapter.id}>
                    {chapter.title}
                  </SelectItem>
                ))}
              </Select>
              <Input
                type="datetime-local"
                label="Дедлайн (необязательно)"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
              />
            </CardBody>
            <CardFooter className="flex gap-3 justify-end">
              {editing && (
                <Button
                  variant="light"
                  onPress={resetForm}
                  disabled={isSubmitting}
                >
                  Отменить
                </Button>
              )}
              <Button
                color="primary"
                type="submit"
                isDisabled={isSubmitting}
              >
                {editing ? "Сохранить" : "Создать задание"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};


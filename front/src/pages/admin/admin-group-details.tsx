import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import {
  getGroupById,
  addGroupMember,
  removeGroupMember,
  enrollGroupToCourse,
  GroupDetail,
} from "../../api/groups";
import { getAllCourses } from "../../api/courses";
import { Course } from "../../types/course";

interface RouteParams {
  groupId: string;
}

export const AdminGroupDetails: React.FC = () => {
  const { groupId } = useParams<RouteParams>();

  const [group, setGroup] = React.useState<GroupDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [courses, setCourses] = React.useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("");

  const [memberEmail, setMemberEmail] = React.useState("");
  const [memberError, setMemberError] = React.useState<string | null>(null);
  const [isAddingMember, setIsAddingMember] = React.useState(false);
  const [isEnrollingGroup, setIsEnrollingGroup] = React.useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [groupData, coursesData] = await Promise.all([
        getGroupById(groupId),
        getAllCourses(),
      ]);
      setGroup(groupData);
      setCourses(coursesData);
    } catch (err: any) {
      const backendMessage = err?.response?.data?.detail;
      const fallbackMessage = err?.message;
      setError(
        backendMessage ||
          fallbackMessage ||
          "Не удалось загрузить данные группы",
      );
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [groupId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setMemberError("Введи email участника");
      return;
    }
    try {
      setIsAddingMember(true);
      setMemberError(null);
      const updated = await addGroupMember(groupId, {
        email: memberEmail.trim(),
      });
      setGroup(updated);
      setMemberEmail("");
    } catch (err: any) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.detail;
      let message = "Не удалось добавить участника в группу";

      if (status === 404) {
        message = "Пользователь с таким email не найден";
      } else if (status === 400) {
        message = backendMessage || "Укажи корректный email участника";
      } else if (backendMessage) {
        message = backendMessage;
      }

      setMemberError(message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("Удалить участника из группы?")) return;
    try {
      await removeGroupMember(groupId, userId);
      await loadData();
    } catch {
      alert("Не удалось удалить участника");
    }
  };

  const handleEnrollGroupToCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    try {
      setIsEnrollingGroup(true);
      const updated = await enrollGroupToCourse(groupId, selectedCourseId);
      setGroup(updated);
    } catch (err: any) {
      const backendMessage = err?.response?.data?.detail;
      const fallbackMessage = err?.message;
      setError(
        backendMessage ||
          fallbackMessage ||
          "Не удалось записать группу на курс",
      );
    } finally {
      setIsEnrollingGroup(false);
    }
  };

  const availableCourses = React.useMemo(() => {
    if (!group) return courses;
    const linkedIds = new Set(group.courses.map((c) => c.courseId));
    return courses.filter((course) => !linkedIds.has(course.id));
  }, [courses, group]);

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:users-2" className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold">
              {group ? group.name : "Детали группы"}
            </h1>
            {group && (
              <p className="text-sm text-default-500">
                Участников: {group.members.length} • Курсов:{" "}
                {group.courses.length}
              </p>
            )}
          </div>
        </div>
        <Button
          as={Link}
          to="/admin/groups"
          variant="light"
          startContent={<Icon icon="lucide:arrow-left" />}
        >
          Назад к группам
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" color="primary" />
        </div>
      ) : group ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon
                    icon="lucide:id-card"
                    className="h-5 w-5 text-primary"
                  />
                  <h2 className="text-lg font-semibold">Участники</h2>
                </div>
              </CardHeader>
              <CardBody>
                <Table
                  aria-label="Участники группы"
                  removeWrapper
                  isHeaderSticky
                  classNames={{
                    table: "min-h-[200px]",
                  }}
                >
                  <TableHeader>
                    <TableColumn>Имя</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Действия</TableColumn>
                  </TableHeader>
                  <TableBody
                    items={group.members}
                    emptyContent="В группе пока нет участников"
                  >
                    {(member) => (
                      <TableRow key={member.userId}>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            startContent={<Icon icon="lucide:user-minus" />}
                            onPress={() => handleRemoveMember(member.userId)}
                          >
                            Удалить
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon
                    icon="lucide:book-open-check"
                    className="h-5 w-5 text-primary"
                  />
                  <h2 className="text-lg font-semibold">
                    Курсы, к которым привязана группа
                  </h2>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <Table
                  aria-label="Курсы группы"
                  removeWrapper
                  classNames={{
                    table: "min-h-[120px]",
                  }}
                >
                  <TableHeader>
                    <TableColumn>Курс</TableColumn>
                    <TableColumn>Действия</TableColumn>
                  </TableHeader>
                  <TableBody
                    items={group.courses}
                    emptyContent="Группа ещё не привязана ни к одному курсу"
                  >
                    {(course) => (
                      <TableRow key={course.courseId}>
                        <TableCell>{course.title}</TableCell>
                        <TableCell>
                          <Button
                            as={Link}
                            to={`/admin/analytics/courses/${course.courseId}`}
                            size="sm"
                            variant="light"
                            startContent={<Icon icon="lucide:bar-chart-3" />}
                          >
                            Аналитика курса
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <form
                  className="mt-4 flex flex-col gap-3 md:flex-row"
                  onSubmit={handleEnrollGroupToCourse}
                >
                  <Select
                    label="Выбери курс"
                    selectedKeys={selectedCourseId ? [selectedCourseId] : []}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="md:flex-1"
                    placeholder="Выбери курс для группы"
                  >
                    {availableCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </Select>
                  <Button
                    type="submit"
                    color="primary"
                    className="md:w-[260px]"
                    isLoading={isEnrollingGroup}
                    startContent={<Icon icon="lucide:users-round" />}
                    isDisabled={!availableCourses.length}
                  >
                    Записать группу на курс
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon
                    icon="lucide:info"
                    className="h-5 w-5 text-primary"
                  />
                  <h2 className="text-lg font-semibold">Информация о группе</h2>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-default-500">Статус</span>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={
                      group.status === "active"
                        ? "success"
                        : group.status === "archived"
                        ? "default"
                        : "warning"
                    }
                  >
                    {group.status === "active"
                      ? "Активна"
                      : group.status === "archived"
                      ? "Архив"
                      : group.status}
                  </Chip>
                </div>
                {group.description && (
                  <div>
                    <p className="text-sm font-medium mb-1">Описание</p>
                    <p className="text-sm text-default-500">
                      {group.description}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon
                    icon="lucide:user-plus"
                    className="h-5 w-5 text-primary"
                  />
                  <h2 className="text-lg font-semibold">
                    Добавить участника по email
                  </h2>
                </div>
              </CardHeader>
              <CardBody>
                <form className="space-y-3" onSubmit={handleAddMember}>
                  <Input
                    type="email"
                    label="Email участника"
                    placeholder="student@example.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    isRequired
                  />
                  <div className="space-y-1">
                    <Button
                      type="submit"
                      color="primary"
                      fullWidth
                      isLoading={isAddingMember}
                      startContent={<Icon icon="lucide:user-plus-2" />}
                    >
                      Добавить в группу
                    </Button>
                    {memberError && (
                      <p className="text-xs text-red-400 text-center">
                        {memberError}
                      </p>
                    )}
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      ) : (
        <div className="py-8 text-sm text-slate-400">
          Группа не найдена или недоступна.
        </div>
      )}
    </Layout>
  );
};

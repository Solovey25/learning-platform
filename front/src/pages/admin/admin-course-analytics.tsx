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
  Spinner,
  Chip,
  Button,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import {
  getAdminCourseUsersAnalytics,
  AdminCourseUsersAnalytics,
  AdminCourseUserProgress,
} from "../../api/users";
import {
  getCourseParticipants,
  CourseParticipantsResponse,
} from "../../api/groups";

interface RouteParams {
  courseId: string;
}

export const AdminCourseAnalytics: React.FC = () => {
  const { courseId } = useParams<RouteParams>();
  const [data, setData] = React.useState<AdminCourseUsersAnalytics | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [participants, setParticipants] = React.useState<CourseParticipantsResponse | null>(null);
  const [isParticipantsLoading, setIsParticipantsLoading] = React.useState(false);
  const [participantsError, setParticipantsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getAdminCourseUsersAnalytics(courseId);
        setData(response);
      } catch (err: any) {
        const backendMessage = err?.response?.data?.detail;
        const fallbackMessage = err?.message;
        setError(
          backendMessage ||
            fallbackMessage ||
            "Не удалось загрузить данные по пользователям курса",
        );
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [courseId]);

  React.useEffect(() => {
    const loadParticipants = async () => {
      try {
        setIsParticipantsLoading(true);
        setParticipantsError(null);
        const response = await getCourseParticipants(courseId);
        setParticipants(response);
      } catch (err: any) {
        const backendMessage = err?.response?.data?.detail;
        const fallbackMessage = err?.message;
        setParticipantsError(
          backendMessage ||
            fallbackMessage ||
            "Не удалось загрузить участников курса",
        );
      } finally {
        setIsParticipantsLoading(false);
      }
    };

    loadParticipants();
  }, [courseId]);

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            icon="lucide:users"
            className="h-6 w-6 text-primary"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold">
              Пользователи курса
            </h1>
            {data && (
              <p className="text-sm text-default-500">
                Курс: {data.title}
              </p>
            )}
          </div>
        </div>
        <Button
          as={Link}
          to="/admin/analytics"
          variant="light"
          startContent={<Icon icon="lucide:arrow-left" />}
        >
          Назад к аналитике
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
      ) : data ? (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Записанные пользователи
                </h2>
                <p className="text-xs text-default-500">
                  Всего глав в курсе: {data.totalChapters}
                </p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              <Table
                aria-label="Пользователи, записанные на курс"
                removeWrapper
                classNames={{
                  table: "min-h-[200px]",
                }}
              >
                <TableHeader>
                  <TableColumn>Пользователь</TableColumn>
                  <TableColumn>Email</TableColumn>
                  <TableColumn>Прогресс</TableColumn>
                  <TableColumn>Текущая глава</TableColumn>
                </TableHeader>
                <TableBody
                  items={data.users as AdminCourseUserProgress[]}
                  emptyContent="На курс пока никто не записался"
                >
                  {(user) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={
                            user.progress >= 70
                              ? "success"
                              : user.progress >= 30
                              ? "warning"
                              : "default"
                          }
                          variant="flat"
                        >
                          {user.progress}%
                        </Chip>
                        <span className="ml-2 text-xs text-default-500">
                          ({user.completedChapters} глав завершено)
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.currentChapterOrder && user.currentChapterTitle ? (
                          <span>
                            Глава {user.currentChapterOrder}:{" "}
                            {user.currentChapterTitle}
                          </span>
                        ) : (
                          <span className="text-default-400">
                            Курс завершён
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Участники курса и группы
                </h2>
                <p className="text-xs text-default-500">
                  Список всех записавшихся и их принадлежность к группам
                </p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              {participantsError && (
                <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {participantsError}
                </div>
              )}
              <Table
                aria-label="Участники курса и группы"
                removeWrapper
                classNames={{
                  table: "min-h-[200px]",
                }}
              >
                <TableHeader>
                  <TableColumn>Пользователь</TableColumn>
                  <TableColumn>Email</TableColumn>
                  <TableColumn>Группы</TableColumn>
                </TableHeader>
                <TableBody
                  items={participants?.participants || []}
                  isLoading={isParticipantsLoading}
                  loadingContent={<Spinner size="sm" color="primary" />}
                  emptyContent="На курс пока никто не записался"
                >
                  {(participant) => (
                    <TableRow key={participant.userId}>
                      <TableCell>{participant.name}</TableCell>
                      <TableCell>{participant.email}</TableCell>
                      <TableCell>
                        {participant.groups && participant.groups.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {participant.groups.map((group) => (
                              <Chip
                                key={group.groupId}
                                size="sm"
                                variant="flat"
                                color="secondary"
                              >
                                {group.name}
                              </Chip>
                            ))}
                          </div>
                        ) : (
                          <span className="text-default-400 text-xs">
                            Не состоит ни в одной группе
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="py-8 text-sm text-slate-400">
          Данные по пользователям курса недоступны.
        </div>
      )}
    </Layout>
  );
}

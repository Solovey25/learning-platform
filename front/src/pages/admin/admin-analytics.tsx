import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import { Link } from "react-router-dom";
import {
  getAdminAnalytics,
  AdminAnalyticsOverview,
  AdminCourseAnalytics,
} from "../../api/users";

export const AdminAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = React.useState<AdminAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAdminAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        const backendMessage = err?.response?.data?.detail;
        const fallbackMessage = err?.message;
        setError(
          backendMessage ||
            fallbackMessage ||
            "Не удалось загрузить аналитику",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  return (
    <Layout>
      <div className="mb-6 flex items-center gap-2">
        <Icon
          icon="lucide:bar-chart-3"
          className="h-6 w-6 text-primary"
        />
        <h1 className="text-2xl font-semibold">
          Аналитика платформы
        </h1>
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
      ) : analytics ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">
                Общая статистика
              </h2>
            </CardHeader>
            <Divider />
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-950/60 p-4 ring-1 ring-slate-800/80">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Пользователи
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {analytics.totalUsers}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Админы: {analytics.totalAdmins} • Студенты:{" "}
                    {analytics.totalStudents}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-4 ring-1 ring-slate-800/80">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Курсы и главы
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {analytics.totalCourses}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Глав: {analytics.totalChapters}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-4 ring-1 ring-slate-800/80">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Квизы
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {analytics.totalQuizzes}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Завершённых глав:{" "}
                    {analytics.totalCompletedChapters}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-4 ring-1 ring-slate-800/80">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Записи на курсы
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {analytics.totalEnrollments}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Средний прогресс по курсам:{" "}
                    {analytics.averageCompletionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Статистика по курсам
              </h2>
            </CardHeader>
            <Divider />
            <CardBody>
              <Table
                aria-label="Аналитика по курсам"
                removeWrapper
                classNames={{
                  table: "min-h-[200px]",
                }}
              >
                <TableHeader>
                  <TableColumn>Курс</TableColumn>
                  <TableColumn>Записались</TableColumn>
                  <TableColumn>Завершение</TableColumn>
                </TableHeader>
                <TableBody
                  items={analytics.courses as AdminCourseAnalytics[]}
                  emptyContent="Пока нет курсов"
                >
                  {(course) => (
                    <TableRow key={course.courseId}>
                      <TableCell>
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => {
                            window.location.href = `/admin/analytics/courses/${course.courseId}`;
                          }}
                        >
                          {course.title}
                        </button>
                      </TableCell>
                      <TableCell>{course.totalEnrollments}</TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={
                            course.completionRate >= 70
                              ? "success"
                              : course.completionRate >= 30
                              ? "warning"
                              : "default"
                          }
                          variant="flat"
                        >
                          {course.completionRate.toFixed(1)}%
                        </Chip>
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
          Данные аналитики недоступны.
        </div>
      )}
    </Layout>
  );
}

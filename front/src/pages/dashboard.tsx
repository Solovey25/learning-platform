import React from "react";
import { Card, CardBody, CardHeader, Divider, Tabs, Tab, Spinner, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../components/layout";
import { Link } from "react-router-dom";
import { CourseCard } from "../components/course-card";
import { useAuth } from "../contexts/auth-context";
import { getUserCourses } from "../api/courses";
import { getMyAssignments, MyAssignmentsResponse } from "../api/assignments";
import { Course } from "../types/course";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = React.useState("all");
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = React.useState<Course[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [assignmentsStats, setAssignmentsStats] = React.useState<{
    total: number;
    graded: number;
  }>({ total: 0, graded: 0 });
  
  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const userCourses = await getUserCourses();
        setCourses(userCourses);
        setEnrolledCourses(userCourses.filter(course => course.enrolled));
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchCourses();
    }
  }, [user]);

  React.useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response: MyAssignmentsResponse = await getMyAssignments();
        const total = response.items.length;
        const graded = response.items.filter(
          (item) => item.grade != null
        ).length;
        setAssignmentsStats({ total, graded });
      } catch (error) {
        console.error("Failed to fetch assignments summary:", error);
      }
    };

    if (user) {
      fetchAssignments();
    }
  }, [user]);

  return (
    <Layout>
      <div className="mb-8 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-500/20 via-slate-950 to-slate-950 p-6 shadow-lg shadow-indigo-900/40">
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950/80 ring-1 ring-indigo-500/50">
              <Icon icon="lucide:users-2" className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Привет, {user?.name}!
              </h1>
              <p className="text-sm text-slate-300">
                Собирай группы на курсы, выполняй командные задания и отслеживай прогресс.
              </p>
            </div>
          </div>
          <div className="mt-2 grid gap-4 text-xs text-slate-200 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800/80">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                Твои курсы
              </p>
              <p className="text-lg font-semibold">{enrolledCourses.length}</p>
            </div>
            <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800/80">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                Всего курсов
              </p>
              <p className="text-lg font-semibold">{courses.length}</p>
            </div>
            <div className="rounded-xl bg-slate-950/60 p-3 ring-1 ring-slate-800/80">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                Проверенные задания
              </p>
              <p className="text-sm font-medium">
                {assignmentsStats.graded}/{assignmentsStats.total}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-lg shadow-slate-950/40 flex flex-col justify-between">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Как эффективнее учиться в команде
          </p>
          <ul className="space-y-3 text-sm text-slate-200">
            <li className="flex gap-2">
              <Icon icon="lucide:clock" className="mt-0.5 h-4 w-4 text-indigo-400" />
              <span>Выдели 20–30 минут в день на совместное прохождение курса с группой.</span>
            </li>
            <li className="flex gap-2">
              <Icon icon="lucide:messages-square" className="mt-0.5 h-4 w-4 text-indigo-400" />
              <span>Обсуждай задания с командой и задавай вопросы преподавателю.</span>
            </li>
            <li className="flex gap-2">
              <Icon icon="lucide:target" className="mt-0.5 h-4 w-4 text-indigo-400" />
              <span>Отмечай прогресс по главам, чтобы видеть, где нужна дополнительная практика.</span>
            </li>
          </ul>
          <Button
            as={Link}
            to="/assignments"
            size="sm"
            className="mt-4 self-start"
            color="primary"
            variant="flat"
            startContent={<Icon icon="lucide:clipboard-list" />}
          >
            Мои задания
          </Button>
        </div>
      </div>

      <Tabs 
        selectedKey={selectedTab} 
        onSelectionChange={setSelectedTab as any}
        aria-label="Course tabs"
        className="mb-6"
      >
        <Tab 
          key="all" 
          textValue="Все курсы"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:layout-grid" />
              <span>Все курсы</span>
            </div>
          }
        >
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" color="primary" />
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Card className="border border-dashed border-slate-700 bg-slate-950/60">
              <CardBody className="flex flex-col items-center justify-center py-12">
                <Icon icon="lucide:book-x" className="text-slate-500 mb-4" width={48} height={48} />
                <p className="text-slate-400 text-sm">Пока нет доступных курсов.</p>
              </CardBody>
            </Card>
          )}
        </Tab>
        <Tab 
          key="enrolled" 
          textValue="Мои курсы"
          title={
            <div className="flex items-center gap-2">
              <Icon icon="lucide:bookmark" />
              <span>Мои курсы</span>
            </div>
          }
        >
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <Card className="border border-dashed border-slate-700 bg-slate-950/60">
              <CardBody className="flex flex-col items-center justify-center py-12">
                <Icon icon="lucide:book-marked" className="text-slate-500 mb-4" width={48} height={48} />
                <p className="text-slate-400 text-sm">Ты ещё не записался ни на один курс.</p>
              </CardBody>
            </Card>
          )}
        </Tab>
      </Tabs>
    </Layout>
  );
};

import React from "react";
import { useParams, Link, useHistory } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import {
  AssignmentDetail,
  SubmissionSummary,
  getAssignment,
  getSubmissionsForAssignment,
} from "../../api/assignments";

interface RouteParams {
  assignmentId: string;
}

export const AdminAssignmentSubmissions: React.FC = () => {
  const { assignmentId } = useParams<RouteParams>();
  const history = useHistory();

  const [assignment, setAssignment] =
    React.useState<AssignmentDetail | null>(null);
  const [submissions, setSubmissions] = React.useState<
    SubmissionSummary[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [assignmentData, submissionsData] = await Promise.all(
          [
            getAssignment(assignmentId),
            getSubmissionsForAssignment(assignmentId),
          ]
        );
        setAssignment(assignmentData);
        setSubmissions(submissionsData);
      } catch (err) {
        console.error("Failed to load submissions:", err);
        setError(
          "Не удалось загрузить работы по заданию. Попробуй позже."
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [assignmentId]);

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
            onClick={() => history.goBack()}
            className="mb-2 inline-flex items-center text-sm text-default-500 hover:text-default-700"
          >
            <Icon
              icon="lucide:arrow-left"
              className="mr-1 h-4 w-4"
            />
            Назад
          </button>
          <h1 className="text-2xl font-semibold">
            Работы по заданию
          </h1>
          {assignment && (
            <p className="text-default-500">
              {assignment.title}
            </p>
          )}
        </div>
        {assignment && (
          <Button
            as={Link}
            to={`/admin/courses/${assignment.courseId}/assignments`}
            variant="flat"
            color="primary"
            startContent={<Icon icon="lucide:clipboard-list" />}
          >
            К заданиям курса
          </Button>
        )}
      </div>

      {error && (
        <Card className="mb-4 border border-danger-500 bg-danger-50">
          <CardBody>
            <p className="text-sm text-danger-700">{error}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <h2 className="text-lg font-semibold">
                Список работ
              </h2>
              <p className="text-xs text-default-500">
                Здесь преподаватель видит все сдачи по заданию и
                может перейти к оценке.
              </p>
            </div>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          {isLoading ? (
            <p>Загрузка...</p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-default-500">
              Пока нет ни одной работы по этому заданию.
            </p>
          ) : (
            <Table
              removeWrapper
              aria-label="Submissions table"
            >
              <TableHeader>
                <TableColumn>Студент</TableColumn>
                <TableColumn>Дата сдачи</TableColumn>
                <TableColumn>Оценка</TableColumn>
                <TableColumn>Действия</TableColumn>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.userName}</TableCell>
                    <TableCell>
                      {formatDate(sub.createdAt)}
                    </TableCell>
                    <TableCell>
                      {sub.grade != null
                        ? `${sub.grade}`
                        : "Не оценено"}
                    </TableCell>
                    <TableCell>
                      <Button
                        as={Link}
                        to={`/admin/assignments/${assignmentId}/submissions/${sub.id}`}
                        size="sm"
                        variant="flat"
                        color="secondary"
                        startContent={
                          <Icon
                            icon="lucide:eye"
                            width={16}
                            height={16}
                          />
                        }
                      >
                        Открыть
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </Layout>
  );
};


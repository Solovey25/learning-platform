import React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../components/layout";
import { getMyAssignments, MyAssignmentWork } from "../api/assignments";

export const Assignments: React.FC = () => {
  const [items, setItems] = React.useState<MyAssignmentWork[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getMyAssignments();
        setItems(response.items);
      } catch (err) {
        console.error("Failed to load assignments:", err);
        setError("Не удалось загрузить задания. Попробуй позже.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleString();
  };

  const getStatus = (item: MyAssignmentWork) => {
    if (!item.latestSubmissionId) {
      return "Не сдано";
    }
    if (item.grade != null) {
      return "Оценено";
    }
    return "Ожидает проверки";
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Мои задания</h1>
          <p className="text-sm text-default-500">
            Здесь собраны все задания по курсам, на которые ты записан, и статус твоих работ.
          </p>
        </div>
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
          <h2 className="text-lg font-semibold">Задания</h2>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <p>Загрузка...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-default-500">
              Пока нет заданий по твоим курсам.
            </p>
          ) : (
            <Table removeWrapper aria-label="Assignments list">
              <TableHeader>
                <TableColumn>Задание</TableColumn>
                <TableColumn>Курс</TableColumn>
                <TableColumn>Дата последней сдачи</TableColumn>
                <TableColumn>Статус</TableColumn>
                <TableColumn>Действия</TableColumn>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.assignmentId}>
                    <TableCell>{item.assignmentTitle}</TableCell>
                    <TableCell>{item.courseTitle}</TableCell>
                    <TableCell>{formatDate(item.latestCreatedAt)}</TableCell>
                    <TableCell>{getStatus(item)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          as={Link}
                          to={`/assignments/${item.assignmentId}`}
                          size="sm"
                          variant="flat"
                          color="primary"
                          startContent={<Icon icon="lucide:edit-3" width={16} height={16} />}
                        >
                          Открыть
                        </Button>
                        <Button
                          as={Link}
                          to={`/courses/${item.courseId}`}
                          size="sm"
                          variant="light"
                          startContent={<Icon icon="lucide:book-open" width={16} height={16} />}
                        >
                          К курсу
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
    </Layout>
  );
};


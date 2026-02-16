import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Textarea, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../components/layout";
import { getAssignment, createSubmission, getMyAssignments, getSubmission } from "../api/assignments";
import type { AssignmentDetail, MyAssignmentWork, SubmissionDetail } from "../api/assignments";

interface RouteParams {
  assignmentId: string;
}

export const AssignmentDetails: React.FC = () => {
  const { assignmentId } = useParams<RouteParams>();
  const history = useHistory();

  const [assignment, setAssignment] = React.useState<AssignmentDetail | null>(null);
  const [myItem, setMyItem] = React.useState<MyAssignmentWork | null>(null);
  const [submission, setSubmission] = React.useState<SubmissionDetail | null>(null);
  const [repositoryUrl, setRepositoryUrl] = React.useState("");
  const [textAnswer, setTextAnswer] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const [assignmentData, myAssignments] = await Promise.all([
          getAssignment(assignmentId),
          getMyAssignments(),
        ]);

        setAssignment(assignmentData);

        const item = myAssignments.items.find((x) => x.assignmentId === assignmentId) || null;
        setMyItem(item);

        if (item && item.latestSubmissionId) {
          const detail = await getSubmission(item.assignmentId, item.latestSubmissionId);
          setSubmission(detail);
          setRepositoryUrl(detail.repositoryUrl ?? "");
          setTextAnswer(detail.textAnswer ?? "");
        } else {
          setRepositoryUrl("");
          setTextAnswer("");
          setSubmission(null);
        }
      } catch (err) {
        console.error("Failed to load assignment:", err);
        setError("Не удалось загрузить задание. Попробуй позже.");
      }
    };
    load();
  }, [assignmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repositoryUrl.trim() && !textAnswer.trim()) {
      setError("Добавь ссылку на работу или текстовый ответ.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      const result = await createSubmission(assignmentId, {
        repositoryUrl: repositoryUrl.trim() || undefined,
        textAnswer: textAnswer.trim() || undefined,
      });

      setSuccess("Работа отправлена. Преподаватель увидит её в списке и сможет оставить комментарий.");
      setSubmission(result);
      history.push("/assignments");
    } catch (err: any) {
      console.error("Failed to submit assignment:", err);
      const status = err?.response?.status;
      let message = "Не удалось отправить работу. Попробуй ещё раз.";
      if (status === 403) {
        message = "Чтобы сдавать это задание, нужно быть записанным на курс.";
      } else if (status === 400) {
        const detail = err?.response?.data?.detail;
        if (detail) {
          message = detail;
        }
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Задание</h1>
        {assignment && (
          <p className="text-sm text-default-500">{assignment.title}</p>
        )}
        {myItem && myItem.latestCreatedAt && (
          <p className="text-xs text-default-500">
            Последняя сдача: {new Date(myItem.latestCreatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {error && (
        <Card className="mb-4 border border-danger-500 bg-danger-50">
          <CardBody>
            <p className="text-sm text-danger-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {success && (
        <Card className="mb-4 border border-success-500 bg-success-50">
          <CardBody>
            <p className="text-sm text-success-700">{success}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Описание задания</h2>
          </CardHeader>
          <Divider />
          <CardBody>
            {assignment ? (
              <p className="whitespace-pre-wrap text-sm">
                {assignment.description}
              </p>
            ) : (
              <p className="text-sm text-default-500">
                Загрузка задания...
              </p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">
                {submission ? "Ответ студента" : "Сдать работу"}
              </h2>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              {submission && (
                <p className="text-xs text-default-500">
                  Работа уже отправлена. Ниже показан твой ответ и результат проверки.
                </p>
              )}
              <Input
                label="Ссылка на репозиторий или проект"
                placeholder="Например: https://github.com/team/project"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                isDisabled={!!submission}
              />
              <Textarea
                label="Текстовый ответ"
                placeholder="Расскажи, что именно ты сделал, какие решения принял и что хотели показать в этой работе."
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                minRows={4}
                isDisabled={!!submission}
              />
              {!submission && (
                <p className="text-xs text-default-500">
                  Можно отправить только ссылку, только текст или оба поля сразу.
                </p>
              )}
              {submission && (
                <div className="space-y-1 text-sm">
                  <p>
                    Статус:{" "}
                    {submission.grade != null
                      ? "Оценено"
                      : "Ожидает проверки"}
                  </p>
                  {submission.grade != null && (
                    <p>Оценка: {submission.grade}</p>
                  )}
                  {submission.feedback && (
                    <p className="whitespace-pre-wrap">
                      Комментарий преподавателя: {submission.feedback}
                    </p>
                  )}
                  {submission.gradedAt && (
                    <p className="text-xs text-default-500">
                      Проверено:{" "}
                      {new Date(submission.gradedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </CardBody>
            {!submission && (
              <CardFooter className="flex justify-end">
                <Button
                  color="primary"
                  type="submit"
                  isDisabled={isSubmitting}
                  startContent={<Icon icon="lucide:send" width={16} height={16} />}
                >
                  Отправить работу
                </Button>
              </CardFooter>
            )}
          </Card>
          {submission && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Детали отправки</h2>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-1 text-sm">
                <p>
                  Дата сдачи:{" "}
                  {submission ? new Date(submission.createdAt ?? "").toLocaleString() : "—"}
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

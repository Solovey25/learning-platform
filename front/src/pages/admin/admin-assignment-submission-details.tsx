import React from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Textarea,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import {
  SubmissionDetail,
  getSubmission,
  gradeSubmission,
} from "../../api/assignments";

interface RouteParams {
  assignmentId: string;
  submissionId: string;
}

export const AdminAssignmentSubmissionDetails: React.FC = () => {
  const { assignmentId, submissionId } = useParams<RouteParams>();
  const history = useHistory();

  const [submission, setSubmission] =
    React.useState<SubmissionDetail | null>(null);
  const [grade, setGrade] = React.useState<string>("");
  const [feedback, setFeedback] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const data = await getSubmission(
          assignmentId,
          submissionId
        );
        setSubmission(data);
        setGrade(
          data.grade != null ? String(data.grade) : ""
        );
        setFeedback(data.feedback || "");
      } catch (err) {
        console.error("Failed to load submission:", err);
        setError(
          "Не удалось загрузить работу. Попробуй ещё раз."
        );
      }
    };
    load();
  }, [assignmentId, submissionId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedGrade =
      grade.trim() === ""
        ? null
        : Number.isNaN(Number(grade))
        ? null
        : Number(grade);

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const updated = await gradeSubmission(
        assignmentId,
        submissionId,
        {
          grade: parsedGrade,
          feedback: feedback.trim() || null,
        }
      );
      setSubmission(updated);
      setSuccess("Оценка и комментарий сохранены.");
    } catch (err) {
      console.error("Failed to save grade:", err);
      setError(
        "Не удалось сохранить оценку. Попробуй ещё раз."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleString();
  };

  return (
    <Layout>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => history.goBack()}
          className="mb-2 inline-flex items-center text-sm text-default-500 hover:text-default-700"
        >
          <Icon
            icon="lucide:arrow-left"
            className="mr-1 h-4 w-4"
          />
          Назад к списку работ
        </button>
        <h1 className="text-2xl font-semibold">
          Работа студента
        </h1>
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
            <p className="text-sm text-success-700">
              {success}
            </p>
          </CardBody>
        </Card>
      )}

      {submission && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
          <Card>
            <CardHeader>
              <div>
                <h2 className="text-lg font-semibold">
                  Ответ студента
                </h2>
                <p className="text-xs text-default-500">
                  {submission.userName} ·{" "}
                  {submission.userEmail}
                </p>
              </div>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-default-500 mb-1">
                  Дата сдачи
                </p>
                <p className="text-sm">
                  {formatDate(submission.createdAt as any)}
                </p>
              </div>
              {submission.repositoryUrl && (
                <div>
                  <p className="text-xs text-default-500 mb-1">
                    Репозиторий / ссылка
                  </p>
                  <a
                    href={submission.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline break-all"
                  >
                    {submission.repositoryUrl}
                  </a>
                </div>
              )}
              {submission.textAnswer && (
                <div>
                  <p className="text-xs text-default-500 mb-1">
                    Текстовый ответ
                  </p>
                  <div className="rounded-lg border border-default-200 bg-default-100 p-3 text-sm whitespace-pre-wrap">
                    {submission.textAnswer}
                  </div>
                </div>
              )}
              {submission.attachments && (
                <div>
                  <p className="text-xs text-default-500 mb-1">
                    Дополнительные данные
                  </p>
                  <pre className="rounded-lg border border-default-200 bg-default-100 p-3 text-xs overflow-x-auto">
                    {JSON.stringify(
                      submission.attachments,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <form onSubmit={handleSave}>
              <CardHeader>
                <h2 className="text-lg font-semibold">
                  Оценка и комментарий
                </h2>
              </CardHeader>
              <Divider />
              <CardBody className="space-y-4">
                <Input
                  label="Оценка (необязательно)"
                  placeholder="Например: 5"
                  value={grade}
                  onChange={(e) =>
                    setGrade(e.target.value)
                  }
                />
                <Textarea
                  label="Комментарий для студента"
                  placeholder="Дай развивающую обратную связь: что получилось хорошо, что улучшить, что делать дальше."
                  value={feedback}
                  onChange={(e) =>
                    setFeedback(e.target.value)
                  }
                  minRows={4}
                />
                <div>
                  <p className="text-xs text-default-500 mb-1">
                    Статус
                  </p>
                  <p className="text-sm">
                    {submission.grade != null
                      ? `Оценено · ${
                          submission.gradedAt
                            ? formatDate(
                                submission.gradedAt as any
                              )
                            : ""
                        }`
                      : "Ожидает проверки"}
                  </p>
                </div>
              </CardBody>
              <CardFooter className="flex justify-end gap-3">
                <Button
                  variant="light"
                  onPress={() => history.goBack()}
                  disabled={isSaving}
                >
                  Отмена
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isDisabled={isSaving}
                >
                  Сохранить
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </Layout>
  );
};


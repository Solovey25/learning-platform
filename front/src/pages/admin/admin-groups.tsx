import React from "react";
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
  Textarea,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Link, useHistory } from "react-router-dom";
import { Layout } from "../../components/layout";
import {
  getGroups,
  createGroup,
  archiveGroup,
  GroupSummary,
} from "../../api/groups";

export const AdminGroups: React.FC = () => {
  const [groups, setGroups] = React.useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const history = useHistory();

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getGroups();
      setGroups(data);
    } catch (err: any) {
      const backendMessage = err?.response?.data?.detail;
      const fallbackMessage = err?.message;
      setError(
        backendMessage ||
          fallbackMessage ||
          "Не удалось загрузить группы",
      );
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setIsCreating(true);
      await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      await loadGroups();
    } catch (err: any) {
      const backendMessage = err?.response?.data?.detail;
      const fallbackMessage = err?.message;
      setError(
        backendMessage ||
          fallbackMessage ||
          "Не удалось создать группу",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!window.confirm("Архивировать группу? Участники и привязка к курсам сохранятся.")) {
      return;
    }
    try {
      await archiveGroup(groupId);
      await loadGroups();
    } catch {
      alert("Не удалось архивировать группу");
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:users-2" className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold">Группы</h1>
            <p className="text-sm text-default-500">
              Управление учебными группами и классами
            </p>
          </div>
        </div>
        <Button
          as={Link}
          to="/admin"
          variant="light"
          startContent={<Icon icon="lucide:arrow-left" />}
        >
          Назад в админку
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="lucide:users" className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Список групп</h2>
            </div>
          </CardHeader>
          <CardBody>
            {error && (
              <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <Table
              aria-label="Список групп"
              removeWrapper
              isHeaderSticky
              classNames={{
                table: "min-h-[200px]",
              }}
            >
              <TableHeader>
                <TableColumn>Название</TableColumn>
                <TableColumn>Участников</TableColumn>
                <TableColumn>Курсов</TableColumn>
                <TableColumn>Статус</TableColumn>
                <TableColumn>Действия</TableColumn>
              </TableHeader>
              <TableBody
                items={groups}
                isLoading={isLoading}
                loadingContent={<Spinner size="sm" color="primary" />}
                emptyContent="Группы ещё не созданы"
              >
                {(group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          className="text-left text-primary hover:underline"
                          onClick={() =>
                            history.push(`/admin/groups/${group.id}`)
                          }
                        >
                          {group.name}
                        </button>
                        {group.description && (
                          <span className="text-xs text-default-500 line-clamp-1">
                            {group.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{group.memberCount}</TableCell>
                    <TableCell>{group.courseCount}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="light"
                          startContent={<Icon icon="lucide:eye" />}
                          onPress={() =>
                            history.push(`/admin/groups/${group.id}`)
                          }
                        >
                          Открыть
                        </Button>
                        {group.status === "active" && (
                          <Button
                            size="sm"
                            color="warning"
                            variant="light"
                            startContent={<Icon icon="lucide:archive" />}
                            onPress={() => handleArchiveGroup(group.id)}
                          >
                            Архивировать
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Icon icon="lucide:folder-plus" className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Новая группа</h2>
            </div>
          </CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={handleCreateGroup}>
              <Input
                label="Название группы"
                placeholder="Например, Класс А или Команда Frontend"
                value={name}
                onChange={(e) => setName(e.target.value)}
                isRequired
              />
              <Textarea
                label="Описание (необязательно)"
                placeholder="Кратко опиши, для чего эта группа"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                minRows={3}
              />
              <Button
                type="submit"
                color="primary"
                fullWidth
                isLoading={isCreating}
                startContent={<Icon icon="lucide:plus-circle" />}
              >
                Создать группу
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
};


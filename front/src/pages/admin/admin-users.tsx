import React from "react";
import { useHistory } from "react-router-dom";
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
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../../components/layout";
import { getUsers, deleteUser, UserSummary } from "../../api/users";

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = React.useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const history = useHistory();

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      const backendMessage = err?.response?.data?.detail;
      const fallbackMessage = err?.message;
      setError(backendMessage || fallbackMessage || "Не удалось загрузить пользователей");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Удалить пользователя?")) return;
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err) {
      alert("Не удалось удалить пользователя");
    }
  };

  return (
    <Layout>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:users" className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Пользователи</h1>
          </div>
        </CardHeader>
        <CardBody>
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <Table
            aria-label="Список пользователей"
            isHeaderSticky
            removeWrapper
            classNames={{
              table: "min-h-[200px]",
            }}
          >
            <TableHeader>
              <TableColumn>Имя</TableColumn>
              <TableColumn>Email</TableColumn>
              <TableColumn>Роль</TableColumn>
              <TableColumn>Действия</TableColumn>
            </TableHeader>
            <TableBody
              items={users}
              isLoading={isLoading}
              loadingContent="Загрузка..."
              emptyContent="Пользователи не найдены"
            >
              {(user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      color={user.role === "admin" ? "danger" : "default"}
                      variant="flat"
                    >
                      {user.role === "admin" ? "Админ" : "Пользователь"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="light"
                        startContent={<Icon icon="lucide:pencil" />}
                        onPress={() => history.push("/profile")}
                      >
                        Открыть
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        startContent={<Icon icon="lucide:trash-2" />}
                        onPress={() => handleDelete(user.id)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Layout>
  );
};

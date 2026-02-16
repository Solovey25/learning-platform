import React from "react";
import { Card, CardBody, CardHeader, CardFooter, Input, Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Layout } from "../components/layout";
import { useAuth } from "../contexts/auth-context";
import { updateMyProfile, changePassword } from "../api/users";

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [name, setName] = React.useState(user?.name || "");
  const [email, setEmail] = React.useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [profileMessage, setProfileMessage] = React.useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = React.useState<string | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    try {
      setIsSavingProfile(true);
      const updated = await updateMyProfile({ name, email });
      setName(updated.name);
      setEmail(updated.email);
      setProfileMessage("Профиль обновлён");
    } catch (err: any) {
      setProfileError(err.message || "Не удалось обновить профиль");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword || !newPassword) {
      setPasswordError("Заполни оба поля для смены пароля");
      return;
    }

    try {
      setIsChangingPassword(true);
      const result = await changePassword(currentPassword, newPassword);
      setPasswordMessage(result.detail || "Пароль успешно изменён");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Не удалось изменить пароль");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Icon icon="lucide:user" className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Профиль</h2>
          </CardHeader>
          <CardBody>
            {profileError && (
              <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {profileError}
              </div>
            )}
            {profileMessage && (
              <div className="mb-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {profileMessage}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSaveProfile}>
              <Input
                label="Имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                isRequired
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                isRequired
              />
              <CardFooter className="flex justify-between px-0">
                <Button
                  color="primary"
                  type="submit"
                  isLoading={isSavingProfile}
                  startContent={<Icon icon="lucide:save" />}
                >
                  Сохранить
                </Button>
                <Button
                  color="danger"
                  variant="light"
                  onPress={logout}
                  startContent={<Icon icon="lucide:log-out" />}
                >
                  Выйти из аккаунта
                </Button>
              </CardFooter>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center gap-2">
            <Icon icon="lucide:key-round" className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Смена пароля</h2>
          </CardHeader>
          <CardBody>
            {passwordError && (
              <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {passwordError}
              </div>
            )}
            {passwordMessage && (
              <div className="mb-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                {passwordMessage}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleChangePassword}>
              <Input
                label="Текущий пароль"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <Input
                label="Новый пароль"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <CardFooter className="px-0">
                <Button
                  color="primary"
                  type="submit"
                  isLoading={isChangingPassword}
                  startContent={<Icon icon="lucide:key-round" />}
                >
                  Изменить пароль
                </Button>
              </CardFooter>
            </form>
          </CardBody>
        </Card>
      </div>
    </Layout>
  );
};


import React from "react";
import { Link, useHistory } from "react-router-dom";
import { Card, CardBody, CardHeader, CardFooter, Input, Button, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "../contexts/auth-context";

export const Register: React.FC = () => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const { register } = useAuth();
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setIsLoading(true);

    try {
      await register(name, email, password);
      history.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Не удалось создать аккаунт. Попробуй позже.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/60 md:flex-row">
        <div className="relative hidden w-full max-w-sm flex-1 items-stretch justify-between border-r border-slate-800 bg-gradient-to-b from-emerald-500/35 via-slate-950 to-slate-950 px-8 py-10 md:flex">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/80 ring-1 ring-emerald-300/70">
                <Icon icon="lucide:sparkles" className="h-5 w-5 text-emerald-200" />
              </div>
              <div>
                <p className="text-sm font-semibold">Создай учебный профиль</p>
                <p className="text-xs text-slate-100/80">
                  Сохраняй результаты командного обучения и возвращайся к курсам в любое время
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-100">
              Один аккаунт — доступ ко всем курсам, командам и заданиям на платформе.
            </p>
            <ul className="space-y-2 text-xs text-slate-100/80">
              <li className="flex gap-2">
                <Icon icon="lucide:line-chart" className="mt-0.5 h-4 w-4 text-emerald-200" />
                <span>Отслеживай прогресс по главам, заданиям и оценкам.</span>
              </li>
              <li className="flex gap-2">
                <Icon icon="lucide:bookmark-check" className="mt-0.5 h-4 w-4 text-emerald-200" />
                <span>Возвращайся к материалам и комментариям преподавателя в любой момент.</span>
              </li>
            </ul>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.16),_transparent_60%)]" />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-8 md:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Регистрация
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Создай аккаунт</h1>
              <p className="text-sm text-slate-400">
                Заполни несколько полей, чтобы начать обучение.
              </p>
            </div>

            <Card className="w-full border border-slate-800 bg-slate-950/90" disableRipple>
              <CardHeader className="flex flex-col gap-1 items-start">
                <h2 className="text-lg font-semibold">Новый аккаунт</h2>
                <p className="text-xs text-slate-400">Эти данные будут использоваться для входа</p>
              </CardHeader>
              <Divider />
              <CardBody>
                {error && (
                  <div className="mb-4 rounded-medium bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Как к тебе обращаться"
                    isRequired
                    autoComplete="name"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    isRequired
                    autoComplete="email"
                  />
                  <Input
                    label="Пароль"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Создай надёжный пароль"
                    isRequired
                    autoComplete="new-password"
                  />
                  <Input
                    label="Повтор пароля"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повтори пароль"
                    isRequired
                    autoComplete="new-password"
                  />
                  <Button
                    type="submit"
                    color="primary"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Создать аккаунт
                  </Button>
                </form>
              </CardBody>
              <Divider />
              <CardFooter className="flex justify-center">
                <p className="text-xs text-slate-400">
                  Уже есть аккаунт?{" "}
                  <Link to="/login" className="font-medium text-indigo-400">
                    Войти
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

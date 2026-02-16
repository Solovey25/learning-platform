import React from "react";
import { Link, useHistory } from "react-router-dom";
import { Card, CardBody, CardHeader, CardFooter, Input, Button, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "../contexts/auth-context";

export const Login: React.FC = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const { login } = useAuth();
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      history.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Не удалось войти. Проверь email и пароль.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 shadow-2xl shadow-slate-950/60 md:flex-row">
        <div className="relative hidden w-full max-w-sm flex-1 items-stretch justify-between border-r border-slate-800 bg-gradient-to-b from-indigo-500/40 via-slate-950 to-slate-950 px-8 py-10 md:flex">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/80 ring-1 ring-indigo-300/70">
                <Icon icon="lucide:terminal-square" className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <p className="text-sm font-semibold">Command Learning Platform</p>
                <p className="text-xs text-slate-200/80">
                  Платформа для командного обучения преподавателей и студентов
                </p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-100">
              Создавай курсы, формируй команды, выдавай задания и оценивай работы в одном месте.
            </p>
            <ul className="space-y-2 text-xs text-slate-100/80">
              <li className="flex gap-2">
                <Icon icon="lucide:users" className="mt-0.5 h-4 w-4 text-emerald-300" />
                <span>Преподаватели управляют курсами, командами, заданиями и оценками.</span>
              </li>
              <li className="flex gap-2">
                <Icon icon="lucide:clipboard-list" className="mt-0.5 h-4 w-4 text-cyan-300" />
                <span>Студенты сдают работы и получают обратную связь и уведомления.</span>
              </li>
            </ul>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.18),_transparent_60%)]" />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-8 md:px-10">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Вход в платформу
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">С возвращением</h1>
              <p className="text-sm text-slate-400">
                Введи свой email и пароль, чтобы продолжить обучение.
              </p>
            </div>

            <Card className="w-full border border-slate-800 bg-slate-950/90" disableRipple>
              <CardHeader className="flex flex-col gap-1 items-start">
                <h2 className="text-lg font-semibold">Вход</h2>
                <p className="text-xs text-slate-400">Используй аккаунт, созданный в системе</p>
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
                    placeholder="Введите пароль"
                    isRequired
                    autoComplete="current-password"
                  />
                  <Button
                    type="submit"
                    color="primary"
                    fullWidth
                    isLoading={isLoading}
                  >
                    Войти
                  </Button>
                </form>
              </CardBody>
              <Divider />
              <CardFooter className="flex justify-center">
                <p className="text-xs text-slate-400">
                  Нет аккаунта?{" "}
                  <Link to="/register" className="font-medium text-indigo-400">
                    Зарегистрироваться
                  </Link>
                </p>
              </CardFooter>
            </Card>

            <div className="mt-4 text-center text-[11px] text-slate-500">
              <p>Для демо используй заранее созданные учетные записи из backend.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

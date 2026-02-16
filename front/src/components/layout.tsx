import React from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Avatar, Badge, Popover, PopoverTrigger, PopoverContent, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useAuth } from "../contexts/auth-context";
import { getNotifications, getUnreadCount, NotificationItem, markAllNotificationsRead, markNotificationRead, clearNotifications } from "../api/notifications";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loadingNotifications, setLoadingNotifications] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    history.push("/login");
  };

  const loadNotifications = React.useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const [list, count] = await Promise.all([getNotifications(), getUnreadCount()]);
      setNotifications(list.items);
      setUnreadCount(count);
    } catch (e) {
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  React.useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [isNotificationsOpen, loadNotifications]);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));
    }

    if (notification.entity_type === "course" && notification.entity_id) {
      history.push(`/courses/${notification.entity_id}`);
    } else if (notification.entity_type === "assignment" && notification.entity_id) {
      history.push(`/assignments/${notification.entity_id}`);
    }
  };

  const handleOpenNotifications = async () => {
    setIsNotificationsOpen(true);
    await loadNotifications();
  };

  const handleCloseNotifications = () => {
    setIsNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleClearNotifications = async () => {
    if (notifications.length === 0) {
      return;
    }
    await clearNotifications();
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
      <div className="flex min-h-screen flex-col">
        <Navbar
          maxWidth="xl"
          className="backdrop-blur-xl bg-slate-950/70 border-b border-slate-800"
        >
          <NavbarBrand>
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400">
                <Icon icon="lucide:users-2" width={20} height={20} className="text-slate-950" />
              </div>
              <div className="flex flex-col leading-tight">
                <p className="text-sm font-semibold tracking-tight">TeamUp Platform</p>
                <p className="text-[11px] text-slate-400">
                  Платформа для командного обучения с курсами, группами и аналитикой прогресса
                </p>
              </div>
            </Link>
          </NavbarBrand>
          <NavbarContent className="hidden md:flex" justify="center">
            <NavbarItem>
              <Button
                as={Link}
                to="/dashboard"
                size="sm"
                variant={location.pathname.startsWith("/dashboard") ? "solid" : "light"}
                startContent={<Icon icon="lucide:layout-dashboard" />}
              >
                Дашборд
              </Button>
            </NavbarItem>
            {isAdmin && (
              <NavbarItem>
                <Button
                  as={Link}
                  to="/admin"
                  size="sm"
                  variant={location.pathname.startsWith("/admin") ? "solid" : "light"}
                  startContent={<Icon icon="lucide:shield-check" />}
                >
                  Админка
                </Button>
              </NavbarItem>
            )}
          </NavbarContent>
          <NavbarContent justify="end">
            <Popover
  placement="bottom-end"
  offset={15}
  isOpen={isNotificationsOpen}
  onOpenChange={(open) => {
    if (open) handleOpenNotifications();
    else handleCloseNotifications();
  }}
  motionProps={{
    variants: {
      enter: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.1,
          ease: "easeOut",
        },
      },
      exit: {
        opacity: 0,
        scale: 0.95,
        transition: {
          duration: 0.05,
        },
      },
    },
  }}
>

  <PopoverTrigger>
  <Button
    isIconOnly
    variant="light"
    radius="full"
    className="relative w-11 h-11 min-w-[44px] hover:bg-white/10 transition-all active:scale-90 overflow-visible"
  >
    <Badge
      content={unreadCount > 99 ? "99+" : unreadCount}
      isInvisible={unreadCount === 0}
      color="danger"
      size="md"
      shape="circle"
      placement="top-right"
      classNames={{
        badge: "border-2 border-[#020617] translate-x-1 -translate-y-1 shadow-lg"
      }}
    >
      <Icon
        icon={unreadCount > 0 ? "lucide:bell-ring" : "lucide:bell"}
        className={`h-6 w-6 transition-colors ${
          unreadCount > 0 ? "text-cyan-400" : "text-slate-400"
        }`}
      />
    </Badge>
  </Button>
</PopoverTrigger>
  
  <PopoverContent className="w-80 p-0 border border-white/10 bg-slate-950/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
    <div className="flex items-center justify-between w-full px-4 py-3 border-b border-white/5">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold uppercase tracking-wider text-slate-200">
          Уведомления
        </span>
        {unreadCount > 0 && (
          <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-500/20 px-1.5 text-[10px] font-black text-cyan-400 ring-1 ring-inset ring-cyan-500/30">
            {unreadCount}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="text-[11px] font-medium text-slate-500 hover:text-cyan-400 transition-colors disabled:opacity-40 pointer-events-auto"
        >
          Отметить все
        </button>
        <button
          onClick={handleClearNotifications}
          disabled={notifications.length === 0}
          className="text-[11px] font-medium text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40 pointer-events-auto"
        >
          Очистить
        </button>
      </div>
    </div>

    <div className="max-h-[380px] overflow-y-auto scrollbar-hide">
      {loadingNotifications ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="sm" color="primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <Icon icon="lucide:mail-open" className="mb-3 text-slate-700" width={32} />
          <p className="text-xs text-slate-500">У вас нет новых уведомлений</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`group relative flex w-full flex-col items-start gap-1.5 px-4 py-4 text-left transition-colors border-b border-white/5 last:border-0 hover:bg-white/[0.03] ${
                n.is_read ? "opacity-60" : "bg-transparent"
              }`}
            >
              {!n.is_read && (
                <div className="absolute left-1.5 top-5 h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              )}
              
              <div className="flex w-full items-start justify-between">
                <span className={`text-[13px] leading-tight pr-4 ${
                  n.is_read ? "text-slate-400" : "font-semibold text-slate-100 group-hover:text-cyan-400"
                }`}>
                  {n.title}
                </span>
              </div>
              
              {n.body && (
                <p className="line-clamp-2 text-[12px] leading-snug text-slate-400">
                  {n.body}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>

    {notifications.length > 0 && (
      <div className="py-2 border-t border-white/5 text-center">
         <span className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">
           Конец списка
         </span>
      </div>
    )}
  </PopoverContent>
</Popover>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Avatar
                  isBordered
                  as="button"
                  className="transition-transform hover:scale-105"
                  color="primary"
                  name={user?.name}
                  size="sm"
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="Profile Actions" variant="flat">
                <DropdownItem
                  key="profile-info"
                  className="h-14 gap-2"
                >
                  <p className="text-xs text-default-500">Вы вошли как</p>
                  <p className="text-sm font-semibold">{user?.email}</p>
                </DropdownItem>
                <DropdownItem
                  key="dashboard"
                  as={Link}
                  to="/dashboard"
                >
                  Дашборд
                </DropdownItem>
                <DropdownItem
                  key="profile"
                  as={Link}
                  to="/profile"
                >
                  Профиль
                </DropdownItem>
                {isAdmin ? (
                  <DropdownItem
                    key="admin"
                    as={Link}
                    to="/admin"
                  >
                    Кабинет преподавателя
                  </DropdownItem>
                ) : null}
                <DropdownItem
                  key="logout"
                  color="danger"
                  onClick={handleLogout}
                >
                  Выйти
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </NavbarContent>
        </Navbar>
        <main className="flex-1">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-16 -z-10 mx-auto h-72 max-w-3xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.11),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(129,140,248,0.13),_transparent_55%)]" />
            {children}
          </div>
        </main>
        <footer className="border-t border-slate-800 bg-slate-950/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-xs text-slate-500 md:px-6">
            <span>TeamUp Platform</span>
            <span className="hidden gap-2 md:flex">
              <Icon icon="lucide:users" className="h-3 w-3" />
              <span>Командные курсы для преподавателей и студентов</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

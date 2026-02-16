import React from "react";
import { aLogin, aRegister, aGetCurrentUser } from "../api/auth";

// Types
interface User {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

// Create context
export const AuthContext = React.createContext<AuthContextType>({
    user: null,
    isLoading: false,
    login: async () => { },
    register: async () => { },
    logout: () => { },
    isAuthenticated: false,
    isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = React.useState<User | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);

    // Check for existing session on mount
    React.useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("token");
            if (token) {
                try {
                    const userData = await aGetCurrentUser();
                    setUser(userData);
                } catch (error) {
                    console.error("Failed to get current user:", error);
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    // Login function
    const login = async (email: string, password: string) => {
        setIsLoading(true);

        try {
            const username = email;
            const response = await aLogin({ username, password });
            setUser(response.user);
            localStorage.setItem("token", response.access_token);
            localStorage.setItem("user", JSON.stringify(response.user));
        } catch (err: any) {
            const message =
                err?.response?.data?.detail ||
                "Не удалось войти. Проверь email и пароль.";
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Register function
    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);

        try {
            const response = await aRegister({ name, email, password });
            setUser(response.user);
            localStorage.setItem("token", response.access_token);
            localStorage.setItem("user", JSON.stringify(response.user));
        } catch (err: any) {
            const message =
                err?.response?.data?.detail ||
                "Не удалось создать аккаунт. Попробуй позже.";
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    };


    // Logout function
    const logout = () => {
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    };

    const value = {
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
    };


    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => React.useContext(AuthContext);

import api from "./axios";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "user" | "admin";
  };
}

export const aLogin = async (data: LoginRequest) => {
  const formData = new URLSearchParams();
  formData.append("username", data.username);
  formData.append("password", data.password);

  const response = await api.post<AuthResponse>("/auth/login", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
};

export const aRegister = async (data: RegisterRequest) => {
  const response = await api.post<AuthResponse>("/auth/register", data);
  return response.data;
};

export const aGetCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};
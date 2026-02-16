import React from "react";
import { Route, Redirect, RouteProps } from "react-router-dom";
import { useAuth } from "../contexts/auth-context";

export const ProtectedRoute: React.FC<RouteProps> = ({ ...routeProps }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Route {...routeProps} />;
};
import { Navigate, Outlet, useLocation } from "react-router";
import { useOptionalUser } from "../../contexts/user-context";

export function AdminOutlet() {
  const user = useOptionalUser();
  const { pathname: from } = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

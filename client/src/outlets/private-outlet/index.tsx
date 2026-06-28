import { Navigate, Outlet, useLocation } from "react-router";
import { useOptionalUser } from "../../contexts/user-context";

export function PrivateOutlet() {
  const user = useOptionalUser();
  const { pathname: from } = useLocation();
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from }} />;
}

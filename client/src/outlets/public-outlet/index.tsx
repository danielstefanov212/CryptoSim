import { Navigate, Outlet, useLocation } from "react-router";
import { useOptionalUser } from "../../contexts/user-context";

export function PublicOutlet() {
  const user = useOptionalUser();
  const { pathname: from } = useLocation();
  return user ? <Navigate to="/" replace state={{ from }} /> : <Outlet />;
}

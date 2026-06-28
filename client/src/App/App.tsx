import { BrowserRouter, Route, Routes } from "react-router-dom";

import UserProvider from "../contexts/user-context";
import UserPreferencesProvider from "../contexts/user-preferences-context";
import { CryptoPriceProvider } from "../contexts/crypto-price-context";
import { useBrowserNotifications } from "../hooks/use-browser-notifications";

import { PublicOutlet } from "../outlets/public-outlet";
import { PrivateOutlet } from "../outlets/private-outlet";
import { AdminOutlet } from "../outlets/admin-outlet";

import Home from "../pages/home";
import { Register } from "../pages/register";
import NotFoundPage from "../pages/not-found-page";
import { Login } from "../pages/login";
import { TradingPage } from "../pages/trading-page";
import { TradingTickerDetailsPage } from "../pages/trading-ticker-details-page";
import { Profile } from "../pages/profile";
import { Watchlist } from "../pages/watchlist";
import { Alerts } from "../pages/alerts";
import { Reports } from "../pages/reports";
import { ReportRun } from "../pages/report-run";
import { AdminUsers } from "../pages/admin-users";
import { AdminCryptoAssets } from "../pages/admin-crypto-assets";

import Header from "../components/header";
import Footer from "../components/footer";
import styles from "./styles.module.css";

import "../app.css";

function NotificationsBridge() {
  useBrowserNotifications();
  return null;
}

export default function App() {
  return (
    <UserPreferencesProvider>
      <UserProvider>
        <NotificationsBridge />
        <CryptoPriceProvider>
          <div className={styles.app}>
            <div className={styles.mainContent}>
              <BrowserRouter>
                <Header />

                <Routes>
                  <Route path="/" element={<Home />} />

                  <Route element={<PublicOutlet />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                  </Route>

                  <Route element={<PrivateOutlet />}>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/reports/:id" element={<ReportRun />} />
                  </Route>

                  <Route path="/trading" element={<PrivateOutlet />}>
                    <Route index element={<TradingPage />} />
                    <Route
                      path=":symbol"
                      element={<TradingTickerDetailsPage />}
                    />
                  </Route>

                  <Route path="/admin" element={<AdminOutlet />}>
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="crypto-assets" element={<AdminCryptoAssets />} />
                  </Route>

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </BrowserRouter>
            </div>

            <Footer />
          </div>
        </CryptoPriceProvider>
      </UserProvider>
    </UserPreferencesProvider>
  );
}

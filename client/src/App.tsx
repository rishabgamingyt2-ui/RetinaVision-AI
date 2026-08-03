import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./components/DashboardLayout";
import ImageAnalysis from "./pages/ImageAnalysis";
import HistoryPage from "./pages/HistoryPage";
import MetricsPage from "./pages/MetricsPage";
import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";
import ReportsPage from "./pages/ReportsPage";

function DashboardRoutes() {
  return (
    <Switch>
      <Route path="/dashboard/analysis" component={ImageAnalysis} />
      <Route path="/dashboard/history" component={HistoryPage} />
      <Route path="/dashboard/reports" component={ReportsPage} />
      <Route path="/dashboard/metrics" component={MetricsPage} />
      <Route path="/dashboard/settings" component={SettingsPage} />
      <Route path="/dashboard/about" component={AboutPage} />
      <Route path="/dashboard" component={ImageAnalysis} />
    </Switch>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard/:rest*">
        <DashboardLayout>
          <DashboardRoutes />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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
      <Route path="/analysis" component={ImageAnalysis} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/metrics" component={MetricsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/about" component={AboutPage} />
      {/* "/dashboard" itself (basepath strips the prefix) */}
      <Route path="/" component={ImageAnalysis} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      {/* nest: matches /dashboard and any /dashboard/* subpath, rendering the sidebar layout */}
      <Route path="/dashboard" nest>
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

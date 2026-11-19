import Dashboard from "@/components/Dashboard";
import { APP_NAME } from "@/config/app";

export default function Home() {
  return (
    <main id="main">
      <h1>{APP_NAME}</h1>
      <Dashboard />
    </main>
  );
}
